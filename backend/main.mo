import Map "mo:core/Map";
import Time "mo:core/Time";
import Principal "mo:core/Principal";
import Runtime "mo:core/Runtime";
import Iter "mo:core/Iter";
import Text "mo:core/Text";

import MixinAuthorization "authorization/MixinAuthorization";
import AccessControl "authorization/access-control";


actor {
  type UserId = Text;
  type ModeratorId = Text;
  type WarningId = Text;
  type ReportId = Text;
  type ApplicationId = Text;

  public type UserProfile = {
    name : Text;
    username : Text;
  };

  public type User = {
    id : UserId;
    username : Text;
    status : { #active; #warned; #banned };
    warningCount : Nat;
    maxWarnings : Nat;
    banReason : Text;
    banAppealText : Text;
    isBanned : Bool;
    banAppealStatus : { #none; #pending; #reviewed };
    adminAppealResponse : ?Text;
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
    adminResponse : ?Text;
  };

  public type ModeratorApplication = {
    id : ApplicationId;
    applicantPrincipal : Principal;
    applicantUserId : ?UserId;
    status : { #pending; #approved; #denied };
    timestamp : Int;
    wasWarned : Bool;
    adminResponse : ?Text;
  };

  public type ApplicationResult = {
    #success;
    #failure : {
      message : Text;
      removedFromQueue : Bool;
    };
    #hint;
  };

  public type Result<Ok, Err> = { #ok : Ok; #err : Err };

  let users = Map.empty<UserId, User>();
  let moderators = Map.empty<ModeratorId, Moderator>();
  let warnings = Map.empty<WarningId, Warning>();
  let moderatorReports = Map.empty<ReportId, ModeratorReport>();
  let moderatorApplications = Map.empty<ApplicationId, ModeratorApplication>();
  let userProfiles = Map.empty<Principal, UserProfile>();

  var nextWarningId = 0;
  var nextReportId = 0;
  var nextApplicationId = 0;

  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

  func findModeratorByPrincipalInternal(principal : Principal) : ?Moderator {
    moderators.values().find(func(m : Moderator) : Bool { m.principal == principal });
  };

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

  public shared ({ caller }) func respondToModeratorReport(reportId : Nat, response : Text) : async Result<(), Text> {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      return #err("Unauthorized: Only admins can add responses to moderator reports.");
    };

    switch (moderatorReports.get(reportId.toText())) {
      case (null) {
        #err("Moderator report does not exist.");
      };
      case (?report) {
        let updatedReport : ModeratorReport = {
          id = report.id;
          reportedModeratorId = report.reportedModeratorId;
          reportedByUserId = report.reportedByUserId;
          reason = report.reason;
          timestamp = report.timestamp;
          status = report.status;
          adminResponse = ?response;
        };
        moderatorReports.add(reportId.toText(), updatedReport);
        #ok(());
      };
    };
  };

  public shared ({ caller }) func respondToAppeal(userId : Principal, response : Text) : async Result<(), Text> {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      return #err("Unauthorized: Only admins can add responses to user appeals.");
    };

    switch (users.get(userId.toText())) {
      case (null) {
        #err("User does not exist.");
      };
      case (?user) {
        let updatedUser : User = {
          id = user.id;
          username = user.username;
          status = user.status;
          warningCount = user.warningCount;
          maxWarnings = user.maxWarnings;
          banReason = user.banReason;
          banAppealText = user.banAppealText;
          isBanned = user.isBanned;
          banAppealStatus = user.banAppealStatus;
          adminAppealResponse = ?response;
        };
        users.add(userId.toText(), updatedUser);
        #ok(());
      };
    };
  };

  public shared ({ caller }) func respondToModeratorApplication(applicationId : Nat, response : Text) : async Result<(), Text> {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      return #err("Unauthorized: Only admins can add responses to moderator applications.");
    };

    switch (moderatorApplications.get(applicationId.toText())) {
      case (null) {
        #err("Moderator application does not exist.");
      };
      case (?application) {
        let updatedApplication : ModeratorApplication = {
          id = application.id;
          applicantPrincipal = application.applicantPrincipal;
          applicantUserId = application.applicantUserId;
          status = application.status;
          timestamp = application.timestamp;
          wasWarned = application.wasWarned;
          adminResponse = ?response;
        };
        moderatorApplications.add(applicationId.toText(), updatedApplication);
        #ok(());
      };
    };
  };

  public shared ({ caller }) func applyForModerator(answer : Text, userId : ?UserId) : async ApplicationResult {
    let activeCount = moderators.values().filter(
      func(m) { m.status == #active }
    ).foldLeft(
      0,
      func(count, _m) { count + 1 },
    );
    if (activeCount >= 6) {
      return #failure {
        message = "Maximum of 6 active moderators reached!";
        removedFromQueue = false;
      };
    };

    let totalCount = moderators.size();
    if (totalCount >= 9) {
      return #failure {
        message = "Maximum of 9 total moderator slots reached!";
        removedFromQueue = false;
      };
    };

    if (answer != "1991") {
      return #failure {
        message = "Incorrect answer. Please try again.";
        removedFromQueue = false;
      };
    };

    switch (userId) {
      case (?uid) {
        switch (users.get(uid)) {
          case (null) {
            return #failure {
              message = "Invalid user ID. Application not submitted!";
              removedFromQueue = true;
            };
          };
          case (?user) {
            if (user.status == #banned or user.banAppealStatus == #pending) {
              return #failure {
                message = "You are not eligible to become a moderator due to your current status (Banned or Appealing a Ban)";
                removedFromQueue = true;
              };
            };
          };
        };
      };
      case (null) { () };
    };

    let applicationId = nextApplicationId.toText();
    let application : ModeratorApplication = {
      id = applicationId;
      applicantPrincipal = caller;
      applicantUserId = userId;
      status = #pending;
      timestamp = Time.now();
      wasWarned = false;
      adminResponse = null;
    };

    moderatorApplications.add(applicationId, application);
    nextApplicationId += 1;

    #success;
  };

  public shared ({ caller }) func recordSearchAttempt(applicantPrincipal : Principal) : async Bool {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can record search attempts.");
    };

    let userId = applicantPrincipal.toText();
    switch (users.get(userId)) {
      case (?user) {
        if (user.warningCount < user.maxWarnings) {
          let warningId = ("search_attempt_" # userId # "_").concat(nextWarningId.toText());
          let warning : Warning = {
            id = warningId;
            targetUserId = userId;
            issuedByModeratorId = "system";
            reason = "Attempted to search for trivia answer during moderator application";
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
            maxWarnings = user.maxWarnings;
            banReason = user.banReason;
            banAppealText = user.banAppealText;
            isBanned = user.isBanned;
            banAppealStatus = user.banAppealStatus;
            adminAppealResponse = user.adminAppealResponse;
          };
          users.add(userId, updatedUser);
        } else {
          Runtime.trap("User has reached the maximum number of warnings.");
        };
      };
      case (null) { () };
    };

    let appId = if (moderatorApplications.isEmpty()) {
      null;
    } else {
      ?(nextApplicationId - 1 : Nat).toText();
    };

    switch (appId) {
      case (?id) {
        switch (moderatorApplications.get(id)) {
          case (?application) {
            let updatedApplication : ModeratorApplication = {
              id = application.id;
              applicantPrincipal = application.applicantPrincipal;
              applicantUserId = application.applicantUserId;
              status = application.status;
              timestamp = application.timestamp;
              wasWarned = true;
              adminResponse = application.adminResponse;
            };
            moderatorApplications.add(id, updatedApplication);
            true;
          };
          case (null) { false };
        };
      };
      case (null) { false };
    };
  };

  public query ({ caller }) func getModeratorApplications() : async [ModeratorApplication] {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can view moderator applications.");
    };
    moderatorApplications.values().toArray();
  };

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
          maxWarnings = user.maxWarnings;
          banReason = user.banReason;
          banAppealText = user.banAppealText;
          isBanned = user.isBanned;
          banAppealStatus = user.banAppealStatus;
          adminAppealResponse = user.adminAppealResponse;
        };
        users.add(userId, updatedUser);
      };
    };
  };

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
          maxWarnings = user.maxWarnings;
          banReason = reason;
          banAppealText = "";
          isBanned = true;
          banAppealStatus = #none;
          adminAppealResponse = user.adminAppealResponse;
        };
        users.add(userId, updatedUser);
      };
    };
  };

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
          maxWarnings = user.maxWarnings;
          banReason = "Instant ban for pornographic content";
          banAppealText = "";
          isBanned = true;
          banAppealStatus = #none;
          adminAppealResponse = user.adminAppealResponse;
        };
        users.add(userId, updatedUser);
      };
    };
  };

  public shared ({ caller }) func submitAppeal(userId : UserId, appealText : Text) : async () {
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
              maxWarnings = user.maxWarnings;
              banReason = user.banReason;
              banAppealText = appealText;
              isBanned = user.isBanned;
              banAppealStatus = #pending;
              adminAppealResponse = user.adminAppealResponse;
            };
            users.add(userId, updatedUser);
          };
          case (_) { Runtime.trap("Only banned users can submit appeals."); };
        };
      };
    };
  };

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
            maxWarnings = user.maxWarnings;
            banReason = user.banReason;
            banAppealText = user.banAppealText;
            isBanned = switch (decision) { case (#approve) { false }; case (#deny) { user.isBanned } };
            banAppealStatus = #reviewed;
            adminAppealResponse = user.adminAppealResponse;
          };
          users.add(userId, updatedUser);
        } else {
          Runtime.trap("No pending appeal for this user.");
        };
      };
    };
  };

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
              adminResponse = null;
            };

            moderatorReports.add(reportId, report);
            nextReportId += 1;
          };
        };
      };
    };
  };

  public query ({ caller }) func getModeratorReports() : async [ModeratorReport] {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can view moderator reports.");
    };

    moderatorReports.values().filter(
      func(rep : ModeratorReport) : Bool { rep.status == #pending }
    ).toArray();
  };

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
          adminResponse = report.adminResponse;
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

  public shared ({ caller }) func assignRole(user : Principal, role : AccessControl.UserRole) : async () {
    AccessControl.assignRole(accessControlState, caller, user, role);
  };

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

  public shared ({ caller }) func addUser(userId : UserId, username : Text) : async () {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can add users.");
    };

    let newUser : User = {
      id = userId;
      username;
      status = #active;
      warningCount = 0;
      maxWarnings = 3;
      banReason = "";
      banAppealText = "";
      isBanned = false;
      banAppealStatus = #none;
      adminAppealResponse = null;
    };
    users.add(userId, newUser);
  };

  public query ({ caller }) func getUser(userId : UserId) : async ?User {
    if (caller.toText() != userId and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: You can only view your own user record.");
    };
    users.get(userId);
  };

  public query ({ caller }) func getAllUsers() : async [User] {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can list all users.");
    };
    users.values().toArray();
  };

  public query ({ caller }) func getAllModerators() : async [Moderator] {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can list all moderators.");
    };
    moderators.values().toArray();
  };

  public query ({ caller }) func getUserWarnings(userId : UserId) : async [Warning] {
    if (caller.toText() != userId and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: You can only view your own warnings.");
    };
    warnings.values().filter(
      func(w : Warning) : Bool { w.targetUserId == userId }
    ).toArray();
  };
};

