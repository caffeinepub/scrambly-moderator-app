import Map "mo:core/Map";
import Time "mo:core/Time";
import Order "mo:core/Order";
import Principal "mo:core/Principal";
import Runtime "mo:core/Runtime";
import Iter "mo:core/Iter";
import Text "mo:core/Text";
import MixinAuthorization "authorization/MixinAuthorization";
import AccessControl "authorization/access-control";

actor {
  // Types
  type UserId = Text;
  type ModeratorId = Text;
  type WarningId = Text;
  type ReportId = Text;

  public type UserProfile = {
    name : Text;
    username : Text;
  };

  public type User = {
    id : UserId;
    username : Text;
    status : { #active; #warned; #banned };
    warningCount : Nat;
    banReason : Text;
    banAppealText : Text;
    isBanned : Bool;
    banAppealStatus : { #none; #pending; #reviewed };
  };

  public type Moderator = {
    id : ModeratorId;
    principal : Principal;
    name : Text;
    status : { #active; #banned };
    banReason : Text;
  };

  public type Warning = {
    id : WarningId;
    targetUserId : UserId;
    issuedByModeratorId : ModeratorId;
    reason : Text;
    timestamp : Int;
  };

  public type ModeratorReport = {
    id : ReportId;
    reportedModeratorId : ModeratorId;
    reportedByUserId : UserId;
    reason : Text;
    timestamp : Int;
    status : { #pending; #resolved };
  };

  // State
  let users = Map.empty<UserId, User>();
  let moderators = Map.empty<ModeratorId, Moderator>();
  let warnings = Map.empty<WarningId, Warning>();
  let moderatorReports = Map.empty<ReportId, ModeratorReport>();
  let userProfiles = Map.empty<Principal, UserProfile>();

  var nextWarningId = 0;
  var nextReportId = 0;

  let ADMIN_ID = "jourdain_rodriguez";

  // Authorization system
  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

  // Private helper: find moderator by principal
  func findModeratorByPrincipalInternal(principal : Principal) : ?Moderator {
    moderators.values().find(func(m : Moderator) : Bool { m.principal == principal });
  };

  // Private helper: get user role
  func getUserRoleInternal(p : Principal) : AccessControl.UserRole {
    AccessControl.getUserRole(accessControlState, p);
  };

  // Private helper: check if caller is an active (non-banned) moderator
  func requireActiveModerator(caller : Principal) : Moderator {
    switch (findModeratorByPrincipalInternal(caller)) {
      case (null) { Runtime.trap("Only moderators can perform this action."); };
      case (?moderator) {
        if (moderator.status == #banned) {
          Runtime.trap("Banned moderators cannot perform this action.");
        };
        moderator;
      };
    };
  };

  // User Profile Functions (required by frontend)
  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can get profiles");
    };
    userProfiles.get(caller);
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    if (caller != user and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Can only view your own profile");
    };
    userProfiles.get(user);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can save profiles");
    };
    userProfiles.add(caller, profile);
  };

  // Moderator Actions

  // issueWarning: only active (non-banned) moderators
  public shared ({ caller }) func issueWarning(userId : UserId, reason : Text) : async () {
    let moderator = requireActiveModerator(caller);

    switch (users.get(userId)) {
      case (null) { Runtime.trap("User not found."); };
      case (?user) {
        let warningId = nextWarningId.toText();
        let warning : Warning = {
          id = warningId;
          targetUserId = userId;
          issuedByModeratorId = moderator.id;
          reason;
          timestamp = Time.now();
        };

        warnings.add(warningId, warning);
        nextWarningId += 1;

        let updatedWarningCount = user.warningCount + 1;
        let updatedUser : User = {
          id = user.id;
          username = user.username;
          status = #warned;
          warningCount = updatedWarningCount;
          banReason = user.banReason;
          banAppealText = user.banAppealText;
          isBanned = user.isBanned;
          banAppealStatus = user.banAppealStatus;
        };
        users.add(userId, updatedUser);
      };
    };
  };

  // banUser: only active (non-banned) moderators
  public shared ({ caller }) func banUser(userId : UserId, reason : Text) : async () {
    let _moderator = requireActiveModerator(caller);

    switch (users.get(userId)) {
      case (null) { Runtime.trap("User not found."); };
      case (?user) {
        let updatedUser : User = {
          id = user.id;
          username = user.username;
          status = #banned;
          warningCount = user.warningCount;
          banReason = reason;
          banAppealText = "";
          isBanned = true;
          banAppealStatus = #none;
        };
        users.add(userId, updatedUser);
      };
    };
  };

  // instantBanUser: only active (non-banned) moderators
  public shared ({ caller }) func instantBanUser(userId : UserId) : async () {
    let _moderator = requireActiveModerator(caller);

    switch (users.get(userId)) {
      case (null) { Runtime.trap("User not found."); };
      case (?user) {
        let updatedUser : User = {
          id = user.id;
          username = user.username;
          status = #banned;
          warningCount = user.warningCount;
          banReason = "Instant ban for pornographic content";
          banAppealText = "";
          isBanned = true;
          banAppealStatus = #none;
        };
        users.add(userId, updatedUser);
      };
    };
  };

  // Ban Appeal System

  // submitAppeal: only the banned user themselves (ownership check: caller's principal text must match userId)
  public shared ({ caller }) func submitAppeal(userId : UserId, appealText : Text) : async () {
    // Ownership: the caller must be the user identified by userId
    if (caller.toText() != userId) {
      Runtime.trap("Unauthorized: You can only submit an appeal for your own account.");
    };

    switch (users.get(userId)) {
      case (null) { Runtime.trap("User not found."); };
      case (?user) {
        switch (user.status) {
          case (#banned) {
            if (appealText.size() < 20) {
              Runtime.trap("Ban appeals must be at least 20 characters long.");
            };

            let updatedUser : User = {
              id = user.id;
              username = user.username;
              status = #banned;
              warningCount = user.warningCount;
              banReason = user.banReason;
              banAppealText = appealText;
              isBanned = user.isBanned;
              banAppealStatus = #pending;
            };
            users.add(userId, updatedUser);
          };
          case (_) { Runtime.trap("Only banned users can submit appeals."); };
        };
      };
    };
  };

  // reviewAppeal: admin-only
  public shared ({ caller }) func reviewAppeal(userId : UserId, decision : { #approve; #deny }) : async () {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can review appeals.");
    };

    switch (users.get(userId)) {
      case (null) { Runtime.trap("User not found."); };
      case (?user) {
        if (user.banAppealStatus == #pending) {
          let updatedUser : User = {
            id = user.id;
            username = user.username;
            status = switch (decision) { case (#approve) { #active }; case (#deny) { user.status } };
            warningCount = user.warningCount;
            banReason = user.banReason;
            banAppealText = user.banAppealText;
            isBanned = switch (decision) { case (#approve) { false }; case (#deny) { user.isBanned } };
            banAppealStatus = #reviewed;
          };
          users.add(userId, updatedUser);
        } else {
          Runtime.trap("No pending appeal for this user.");
        };
      };
    };
  };

  // getMyAppealStatus: caller must be the user (ownership check) or admin
  public query ({ caller }) func getMyAppealStatus(userId : UserId) : async Text {
    if (caller.toText() != userId and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: You can only check your own appeal status.");
    };

    switch (users.get(userId)) {
      case (null) { Runtime.trap("User not found."); };
      case (?user) {
        switch (user.banAppealStatus) {
          case (#pending) { "Pending" };
          case (#reviewed) { "Reviewed" };
          case (#none) { "No appeal submitted" };
        };
      };
    };
  };

  // Report a Moderator System

  // reportModerator: only authenticated users (not guests) who have at least one warning
  public shared ({ caller }) func reportModerator(moderatorId : ModeratorId, reason : Text) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only authenticated users can report moderators.");
    };

    if (reason.size() < 30) {
      Runtime.trap("Reports must be at least 30 characters long.");
    };

    let userId = caller.toText();
    switch (users.get(userId)) {
      case (null) { Runtime.trap("User not found."); };
      case (?user) {
        if (user.warningCount == 0) {
          Runtime.trap("You need at least one warning to report a moderator.");
        };

        switch (moderators.get(moderatorId)) {
          case (null) { Runtime.trap("Moderator not found."); };
          case (?_moderator) {
            let reportId = nextReportId.toText();
            let report : ModeratorReport = {
              id = reportId;
              reportedModeratorId = moderatorId;
              reportedByUserId = userId;
              reason;
              timestamp = Time.now();
              status = #pending;
            };

            moderatorReports.add(reportId, report);
            nextReportId += 1;
          };
        };
      };
    };
  };

  // getModeratorReports: admin-only
  public query ({ caller }) func getModeratorReports() : async [ModeratorReport] {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can view moderator reports.");
    };

    moderatorReports.values().filter(
      func(rep : ModeratorReport) : Bool { rep.status == #pending }
    ).toArray();
  };

  // resolveModeratorReport: admin-only
  public shared ({ caller }) func resolveModeratorReport(reportId : ReportId, banModerator : Bool) : async () {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can resolve reports.");
    };

    switch (moderatorReports.get(reportId)) {
      case (null) { Runtime.trap("Report not found."); };
      case (?report) {
        let updatedReport : ModeratorReport = {
          id = report.id;
          reportedModeratorId = report.reportedModeratorId;
          reportedByUserId = report.reportedByUserId;
          reason = report.reason;
          timestamp = report.timestamp;
          status = #resolved;
        };
        moderatorReports.add(reportId, updatedReport);

        if (banModerator) {
          switch (moderators.get(report.reportedModeratorId)) {
            case (null) { () };
            case (?moderator) {
              let updatedModerator : Moderator = {
                id = moderator.id;
                principal = moderator.principal;
                name = moderator.name;
                status = #banned;
                banReason = "Banned due to report " # reportId;
              };
              moderators.add(moderator.id, updatedModerator);
            };
          };
        };
      };
    };
  };

  // Admin management: assign roles (admin-only, enforced inside AccessControl.assignRole)
  public shared ({ caller }) func assignRole(user : Principal, role : AccessControl.UserRole) : async () {
    AccessControl.assignRole(accessControlState, caller, user, role);
  };

  // Admin utility: add a moderator (admin-only)
  public shared ({ caller }) func addModerator(moderatorPrincipal : Principal, name : Text) : async () {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can add moderators.");
    };

    let moderatorId = moderatorPrincipal.toText();
    let newModerator : Moderator = {
      id = moderatorId;
      principal = moderatorPrincipal;
      name;
      status = #active;
      banReason = "";
    };
    moderators.add(moderatorId, newModerator);
  };

  // Admin utility: add a user (admin-only)
  public shared ({ caller }) func addUser(userId : UserId, username : Text) : async () {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can add users.");
    };

    let newUser : User = {
      id = userId;
      username;
      status = #active;
      warningCount = 0;
      banReason = "";
      banAppealText = "";
      isBanned = false;
      banAppealStatus = #none;
    };
    users.add(userId, newUser);
  };

  // Query: get user info (admin or the user themselves)
  public query ({ caller }) func getUser(userId : UserId) : async ?User {
    if (caller.toText() != userId and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: You can only view your own user record.");
    };
    users.get(userId);
  };

  // Query: get all users (admin-only)
  public query ({ caller }) func getAllUsers() : async [User] {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can list all users.");
    };
    users.values().toArray();
  };

  // Query: get all moderators (admin-only)
  public query ({ caller }) func getAllModerators() : async [Moderator] {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can list all moderators.");
    };
    moderators.values().toArray();
  };

  // Query: get warnings for a user (admin or the user themselves)
  public query ({ caller }) func getUserWarnings(userId : UserId) : async [Warning] {
    if (caller.toText() != userId and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: You can only view your own warnings.");
    };
    warnings.values().filter(
      func(w : Warning) : Bool { w.targetUserId == userId }
    ).toArray();
  };
};
