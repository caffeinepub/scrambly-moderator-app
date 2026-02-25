import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export type UserId = string;
export type ReportId = string;
export interface Warning {
    id: WarningId;
    issuedByModeratorId: ModeratorId;
    timestamp: bigint;
    reason: string;
    targetUserId: UserId;
}
export interface User {
    id: UserId;
    status: Variant_active_banned_warned;
    warningCount: bigint;
    username: string;
    banReason: string;
    banAppealStatus: Variant_pending_none_reviewed;
    isBanned: boolean;
    banAppealText: string;
}
export interface Moderator {
    id: ModeratorId;
    status: Variant_active_banned;
    principal: Principal;
    name: string;
    banReason: string;
}
export type ModeratorId = string;
export type WarningId = string;
export interface UserProfile {
    username: string;
    name: string;
}
export interface ModeratorReport {
    id: ReportId;
    status: Variant_resolved_pending;
    reportedModeratorId: ModeratorId;
    timestamp: bigint;
    reportedByUserId: UserId;
    reason: string;
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export enum Variant_active_banned {
    active = "active",
    banned = "banned"
}
export enum Variant_active_banned_warned {
    active = "active",
    banned = "banned",
    warned = "warned"
}
export enum Variant_deny_approve {
    deny = "deny",
    approve = "approve"
}
export enum Variant_pending_none_reviewed {
    pending = "pending",
    none = "none",
    reviewed = "reviewed"
}
export enum Variant_resolved_pending {
    resolved = "resolved",
    pending = "pending"
}
export interface backendInterface {
    addModerator(moderatorPrincipal: Principal, name: string): Promise<void>;
    addUser(userId: UserId, username: string): Promise<void>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    assignRole(user: Principal, role: UserRole): Promise<void>;
    banUser(userId: UserId, reason: string): Promise<void>;
    getAllModerators(): Promise<Array<Moderator>>;
    getAllUsers(): Promise<Array<User>>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getModeratorReports(): Promise<Array<ModeratorReport>>;
    getMyAppealStatus(userId: UserId): Promise<string>;
    getUser(userId: UserId): Promise<User | null>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    getUserWarnings(userId: UserId): Promise<Array<Warning>>;
    instantBanUser(userId: UserId): Promise<void>;
    isCallerAdmin(): Promise<boolean>;
    issueWarning(userId: UserId, reason: string): Promise<void>;
    reportModerator(moderatorId: ModeratorId, reason: string): Promise<void>;
    resolveModeratorReport(reportId: ReportId, banModerator: boolean): Promise<void>;
    reviewAppeal(userId: UserId, decision: Variant_deny_approve): Promise<void>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    submitAppeal(userId: UserId, appealText: string): Promise<void>;
}
