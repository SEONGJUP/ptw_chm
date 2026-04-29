"use client";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

// ─── 타입 정의 ─────────────────────────────────────────────────────────────

export type PermitStatus =
  | "READY_TO_SUBMIT"
  | "CONTRACTOR_SIGNED"
  | "CONTROL_ROOM_REVIEW"
  | "TENANT_MANAGER_REVIEW"
  | "FACILITY_STAFF_REVIEW"
  | "SAFETY_SHE_REVIEW"
  | "SAFETY_SHE_PARTIAL_SIGNED"
  | "FACILITY_MANAGER_FINAL_REVIEW"
  | "APPROVED"
  | "REJECTED"
  | "EXTENSION_REQUESTED"
  | "EXTENSION_APPROVED"
  | "EXTENSION_REJECTED"
  | "CONTRACTOR_COMPLETION_SIGNED"
  | "CONTROL_ROOM_COMPLETION_SIGNED"
  | "LOCKED";

export type UserRole =
  | "CONTRACTOR_SAFETY_MANAGER"
  | "CONTROL_ROOM"
  | "TENANT_MANAGER"
  | "FACILITY_STAFF"
  | "SAFETY_OFFICER"
  | "SHE_MANAGER"
  | "FACILITY_MANAGER";

export interface Person {
  id: string;
  name: string;
  role: UserRole;
  department?: string;
  company?: string;
  contact?: string;
  email?: string;
  floor?: string;
}

export interface SignatureRecord {
  id: string;
  stepCode: string;
  signerRole: UserRole;
  signerName: string;
  signatureDataUrl: string;
  signedAt: string;
  meaning: string;
}

export interface ApprovalHistory {
  id: string;
  actorRole: UserRole;
  actorName: string;
  actionType: string;
  actionLabel: string;
  comment?: string;
  rejectionReason?: string;
  createdAt: string;
  visibleInPrint: boolean;
}

export interface NotificationLog {
  id: string;
  recipientRole: UserRole;
  recipientName: string;
  recipientContact?: string;
  title: string;
  message: string;
  createdAt: string;
  read: boolean;
  relatedStatus: PermitStatus;
}

export interface ExtensionRequest {
  id: string;
  requestedBy: string;
  originalEndAt: string;
  requestedEndAt: string;
  reason: string;
  additionalSafetyMeasure?: string;
  signatureDataUrl: string;
  requestedAt: string;
  approvedBy?: string;
  approvedSignatureDataUrl?: string;
  approvedAt?: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  rejectedReason?: string;
}

export interface CompletionRecord {
  actualCompletedAt: string;
  contractorComment?: string;
  siteCleaned: boolean;
  residualRisk: boolean;
  equipmentRemoved: boolean;
  contractorSignatureDataUrl?: string;
  contractorSignedAt?: string;
  controlRoomSignatureDataUrl?: string;
  controlRoomSignedAt?: string;
  managerFinalConfirmedAt?: string;
  lockedAt?: string;
}

export interface PermitDocument {
  id: string;
  permitNo: string;
  status: PermitStatus;
  title: string;
  siteName: string;
  location: string;
  contractorCompany: string;
  contractorSafetyManagerName: string;
  workType: string;
  workStartAt: string;
  workEndAt: string;
  extendedWorkEndAt?: string;
  actualCompletedAt?: string;
  workerCount: number;
  workDescription: string;
  riskFactors: string[];
  safetyMeasures: string[];
  equipment: string[];
  emergencyContact: string;
  createdAt: string;
  contractorSignedAt?: string;
  approvedAt?: string;
  isLocked: boolean;
  lockedAt?: string;
  // 담당자
  tenantManager?: Person;
  facilityStaff?: Person;
  safetyOfficer?: Person;
  sheManager?: Person;
  // 서명
  signatures: SignatureRecord[];
  // 반려
  rejectionReason?: string;
  // 이력
  history: ApprovalHistory[];
  notifications: NotificationLog[];
  // 연장
  extensionRequests: ExtensionRequest[];
  // 완료
  completion?: CompletionRecord;
  // 안전/SHE 부분서명 추적
  safetyOfficerSigned: boolean;
  sheManagerSigned: boolean;
}

// ─── 샘플 데이터 ────────────────────────────────────────────────────────────

function buildSampleDocument(): PermitDocument {
  return {
    id: "doc_sample_001",
    permitNo: "WP-2026-0001",
    status: "READY_TO_SUBMIT",
    title: "지하 2층 전기실 배관 용접 작업",
    siteName: "세이프타워 신축공사",
    location: "지하 2층 전기실",
    contractorCompany: "대한설비",
    contractorSafetyManagerName: "김시공",
    workType: "화기작업",
    workStartAt: "2026-04-29 09:00",
    workEndAt: "2026-04-29 18:00",
    workerCount: 6,
    workDescription: "지하 2층 전기실 내 배관 용접 및 고정 작업",
    riskFactors: ["화재 위험", "밀폐공간 질식 위험", "감전 위험"],
    safetyMeasures: ["소화기 비치", "화기감시자 배치", "산소농도 측정", "전원 차단 확인"],
    equipment: ["용접기", "절단기", "배관 공구"],
    emergencyContact: "현장 안전팀 010-0000-0000",
    createdAt: new Date().toISOString(),
    isLocked: false,
    signatures: [],
    history: [],
    notifications: [],
    extensionRequests: [],
    safetyOfficerSigned: false,
    sheManagerSigned: false,
  };
}

// ─── Store 인터페이스 ────────────────────────────────────────────────────────

interface ApprovalStore {
  document: PermitDocument | null;
  currentRole: UserRole;
  setCurrentRole: (role: UserRole) => void;
  initDocument: () => void;
  resetDocument: () => void;

  contractorSign: (signature: string) => void;
  controlRoomAssignTenant: (person: Person) => void;
  tenantSign: (signature: string) => void;
  facilityStaffConfirm: (staffPerson: Person) => void;
  assignSafetyAndShe: (safety: Person, she: Person) => void;
  safetyOfficerSign: (signature: string) => void;
  sheManagerSign: (signature: string) => void;
  facilityManagerApprove: (signature: string) => void;
  facilityManagerReject: (reason: string) => void;
  resubmitAfterReject: (signature: string) => void;
  requestExtension: (
    data: Omit<ExtensionRequest, "id" | "requestedAt" | "status" | "approvedBy" | "approvedSignatureDataUrl" | "approvedAt">
  ) => void;
  approveExtension: (signature: string) => void;
  rejectExtension: (reason: string) => void;
  contractorCompleteWork: (
    completion: Omit<CompletionRecord, "contractorSignedAt" | "controlRoomSignatureDataUrl" | "controlRoomSignedAt" | "managerFinalConfirmedAt" | "lockedAt">
  ) => void;
  controlRoomCompleteSign: (signature: string) => void;
  facilityManagerFinalComplete: () => void;
}

// ─── 유틸 ────────────────────────────────────────────────────────────────────

function uid() {
  return `id_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function now() {
  return new Date().toISOString();
}

function addHistory(
  doc: PermitDocument,
  actorRole: UserRole,
  actorName: string,
  actionType: string,
  actionLabel: string,
  visibleInPrint: boolean,
  extra?: { comment?: string; rejectionReason?: string }
): ApprovalHistory[] {
  const entry: ApprovalHistory = {
    id: uid(),
    actorRole,
    actorName,
    actionType,
    actionLabel,
    comment: extra?.comment,
    rejectionReason: extra?.rejectionReason,
    createdAt: now(),
    visibleInPrint,
  };
  return [...doc.history, entry];
}

function addNotification(
  doc: PermitDocument,
  recipientRole: UserRole,
  recipientName: string,
  title: string,
  message: string,
  relatedStatus: PermitStatus,
  recipientContact?: string
): NotificationLog[] {
  const entry: NotificationLog = {
    id: uid(),
    recipientRole,
    recipientName,
    recipientContact,
    title,
    message,
    createdAt: now(),
    read: false,
    relatedStatus,
  };
  return [...doc.notifications, entry];
}

// ─── Store 생성 ──────────────────────────────────────────────────────────────

export const useApprovalStore = create<ApprovalStore>()(
  persist(
    (set, get) => ({
      document: null,
      currentRole: "CONTRACTOR_SAFETY_MANAGER",

      setCurrentRole: (role) => set({ currentRole: role }),

      initDocument: () => {
        const { document } = get();
        if (!document) {
          set({ document: buildSampleDocument() });
        }
      },

      resetDocument: () => {
        set({ document: buildSampleDocument(), currentRole: "CONTRACTOR_SAFETY_MANAGER" });
      },

      // 1) 시공사 안전관리자 서명 → CONTRACTOR_SIGNED
      contractorSign: (signature) => {
        const { document } = get();
        if (!document) return;

        const sigRec: SignatureRecord = {
          id: uid(),
          stepCode: "CONTRACTOR_SIGN",
          signerRole: "CONTRACTOR_SAFETY_MANAGER",
          signerName: document.contractorSafetyManagerName,
          signatureDataUrl: signature,
          signedAt: now(),
          meaning: "작성완료 및 제출 서명",
        };

        const newStatus: PermitStatus = "CONTRACTOR_SIGNED";
        let notifs = addNotification(
          document,
          "CONTROL_ROOM",
          "통제실 담당자",
          "[신규] 작업허가서 검토 요청",
          `${document.contractorSafetyManagerName}(${document.contractorCompany})이 작업허가서를 제출하였습니다. 입주사 관리자를 지정해 주세요.`,
          newStatus
        );
        const hist = addHistory(document, "CONTRACTOR_SAFETY_MANAGER", document.contractorSafetyManagerName, "SIGN", "작성완료 서명", true);

        set({
          document: {
            ...document,
            status: newStatus,
            contractorSignedAt: now(),
            signatures: [...document.signatures, sigRec],
            history: hist,
            notifications: notifs,
          },
        });
      },

      // 2) 통제실: 입주사 관리자 지정 → TENANT_MANAGER_REVIEW
      controlRoomAssignTenant: (person) => {
        const { document } = get();
        if (!document) return;

        const newStatus: PermitStatus = "TENANT_MANAGER_REVIEW";
        const hist = addHistory(document, "CONTROL_ROOM", "박통제", "ASSIGN", "입주사 관리자 지정", false, {
          comment: `${person.name}(${person.company || ""}) 지정`,
        });
        const notifs = addNotification(
          { ...document, history: hist },
          "TENANT_MANAGER",
          person.name,
          "[검토요청] 작업허가서 확인 서명 요청",
          `작업허가서(${document.permitNo})에 대한 입주사 관리자 확인 서명이 필요합니다.`,
          newStatus,
          person.contact
        );

        set({
          document: {
            ...document,
            status: newStatus,
            tenantManager: person,
            history: hist,
            notifications: notifs,
          },
        });
      },

      // 3) 입주사 관리자 서명 → FACILITY_STAFF_REVIEW
      tenantSign: (signature) => {
        const { document } = get();
        if (!document || !document.tenantManager) return;

        const sigRec: SignatureRecord = {
          id: uid(),
          stepCode: "TENANT_SIGN",
          signerRole: "TENANT_MANAGER",
          signerName: document.tenantManager.name,
          signatureDataUrl: signature,
          signedAt: now(),
          meaning: "입주사 관리자 확인 서명",
        };

        const newStatus: PermitStatus = "FACILITY_STAFF_REVIEW";
        const hist = addHistory(document, "TENANT_MANAGER", document.tenantManager.name, "SIGN", "입주사 관리자 확인 서명", true);
        const notifs = addNotification(
          { ...document, history: hist },
          "FACILITY_STAFF",
          "관리소 직원",
          "[검토요청] 실무 담당자 확인 요청",
          `작업허가서(${document.permitNo}) 관리소 직원 실무 확인 및 안전/SHE 담당자 지정이 필요합니다.`,
          newStatus
        );

        set({
          document: {
            ...document,
            status: newStatus,
            signatures: [...document.signatures, sigRec],
            history: hist,
            notifications: notifs,
          },
        });
      },

      // 4) 관리소 직원 확인 + 안전/SHE 지정 → SAFETY_SHE_REVIEW
      facilityStaffConfirm: (staffPerson) => {
        const { document } = get();
        if (!document) return;

        set({
          document: {
            ...document,
            facilityStaff: staffPerson,
          },
        });
      },

      assignSafetyAndShe: (safety, she) => {
        const { document } = get();
        if (!document) return;

        const newStatus: PermitStatus = "SAFETY_SHE_REVIEW";
        const staffName = document.facilityStaff?.name ?? "관리소 직원";
        const hist = addHistory(document, "FACILITY_STAFF", staffName, "ASSIGN", "안전/SHE 담당자 지정 및 서명요청", false, {
          comment: `안전: ${safety.name}, SHE: ${she.name}`,
        });

        let notifs = addNotification(
          { ...document, history: hist },
          "SAFETY_OFFICER",
          safety.name,
          "[서명요청] 안전담당자 서명 요청",
          `작업허가서(${document.permitNo}) 안전담당자 서명이 필요합니다.`,
          newStatus,
          safety.contact
        );
        notifs = addNotification(
          { ...document, notifications: notifs, history: hist },
          "SHE_MANAGER",
          she.name,
          "[서명요청] SHE 관리원 서명 요청",
          `작업허가서(${document.permitNo}) SHE 관리원 서명이 필요합니다.`,
          newStatus,
          she.contact
        );

        set({
          document: {
            ...document,
            status: newStatus,
            safetyOfficer: safety,
            sheManager: she,
            history: hist,
            notifications: notifs,
          },
        });
      },

      // 5-a) 안전담당자 서명
      safetyOfficerSign: (signature) => {
        const { document } = get();
        if (!document || !document.safetyOfficer) return;

        const sigRec: SignatureRecord = {
          id: uid(),
          stepCode: "SAFETY_OFFICER_SIGN",
          signerRole: "SAFETY_OFFICER",
          signerName: document.safetyOfficer.name,
          signatureDataUrl: signature,
          signedAt: now(),
          meaning: "안전담당자 확인 서명",
        };

        const bothSigned = document.sheManagerSigned;
        const newStatus: PermitStatus = bothSigned ? "FACILITY_MANAGER_FINAL_REVIEW" : "SAFETY_SHE_PARTIAL_SIGNED";
        const hist = addHistory(document, "SAFETY_OFFICER", document.safetyOfficer.name, "SIGN", "안전담당자 서명", true);

        let notifs = document.notifications;
        if (bothSigned) {
          notifs = addNotification(
            { ...document, history: hist },
            "FACILITY_MANAGER",
            "관리소장",
            "[최종승인요청] 관리소장 최종 승인 요청",
            `작업허가서(${document.permitNo}) 안전/SHE 서명이 완료되었습니다. 최종 승인을 진행해 주세요.`,
            newStatus
          );
        }

        set({
          document: {
            ...document,
            status: newStatus,
            safetyOfficerSigned: true,
            signatures: [...document.signatures, sigRec],
            history: hist,
            notifications: notifs,
          },
        });
      },

      // 5-b) SHE 관리원 서명
      sheManagerSign: (signature) => {
        const { document } = get();
        if (!document || !document.sheManager) return;

        const sigRec: SignatureRecord = {
          id: uid(),
          stepCode: "SHE_MANAGER_SIGN",
          signerRole: "SHE_MANAGER",
          signerName: document.sheManager.name,
          signatureDataUrl: signature,
          signedAt: now(),
          meaning: "SHE 관리원 확인 서명",
        };

        const bothSigned = document.safetyOfficerSigned;
        const newStatus: PermitStatus = bothSigned ? "FACILITY_MANAGER_FINAL_REVIEW" : "SAFETY_SHE_PARTIAL_SIGNED";
        const hist = addHistory(document, "SHE_MANAGER", document.sheManager.name, "SIGN", "SHE 관리원 서명", true);

        let notifs = document.notifications;
        if (bothSigned) {
          notifs = addNotification(
            { ...document, history: hist },
            "FACILITY_MANAGER",
            "관리소장",
            "[최종승인요청] 관리소장 최종 승인 요청",
            `작업허가서(${document.permitNo}) 안전/SHE 서명이 완료되었습니다. 최종 승인을 진행해 주세요.`,
            newStatus
          );
        }

        set({
          document: {
            ...document,
            status: newStatus,
            sheManagerSigned: true,
            signatures: [...document.signatures, sigRec],
            history: hist,
            notifications: notifs,
          },
        });
      },

      // 6) 관리소장 최종 승인 → APPROVED
      facilityManagerApprove: (signature) => {
        const { document } = get();
        if (!document) return;

        const sigRec: SignatureRecord = {
          id: uid(),
          stepCode: "FACILITY_MANAGER_APPROVE",
          signerRole: "FACILITY_MANAGER",
          signerName: "오소장",
          signatureDataUrl: signature,
          signedAt: now(),
          meaning: "관리소장 최종 승인 서명",
        };

        const newStatus: PermitStatus = "APPROVED";
        const hist = addHistory(document, "FACILITY_MANAGER", "오소장", "APPROVE", "최종 승인", true);
        const notifs = addNotification(
          { ...document, history: hist },
          "CONTRACTOR_SAFETY_MANAGER",
          document.contractorSafetyManagerName,
          "[승인완료] 작업허가서 최종 승인 완료",
          `작업허가서(${document.permitNo})가 최종 승인되었습니다. 작업을 시작하실 수 있습니다.`,
          newStatus
        );

        set({
          document: {
            ...document,
            status: newStatus,
            approvedAt: now(),
            signatures: [...document.signatures, sigRec],
            history: hist,
            notifications: notifs,
          },
        });
      },

      // 관리소장 반려 → REJECTED
      facilityManagerReject: (reason) => {
        const { document } = get();
        if (!document) return;

        const newStatus: PermitStatus = "REJECTED";
        const hist = addHistory(document, "FACILITY_MANAGER", "오소장", "REJECT", "반려", false, {
          rejectionReason: reason,
        });
        const notifs = addNotification(
          { ...document, history: hist },
          "CONTRACTOR_SAFETY_MANAGER",
          document.contractorSafetyManagerName,
          "[반려] 작업허가서 반려 통보",
          `작업허가서(${document.permitNo})가 반려되었습니다. 사유: ${reason}`,
          newStatus
        );

        set({
          document: {
            ...document,
            status: newStatus,
            rejectionReason: reason,
            // 서명 초기화
            signatures: [],
            safetyOfficerSigned: false,
            sheManagerSigned: false,
            history: hist,
            notifications: notifs,
          },
        });
      },

      // 반려 후 재제출 서명 → CONTRACTOR_SIGNED
      resubmitAfterReject: (signature) => {
        const { document } = get();
        if (!document) return;

        const sigRec: SignatureRecord = {
          id: uid(),
          stepCode: "CONTRACTOR_SIGN",
          signerRole: "CONTRACTOR_SAFETY_MANAGER",
          signerName: document.contractorSafetyManagerName,
          signatureDataUrl: signature,
          signedAt: now(),
          meaning: "재제출 서명",
        };

        const newStatus: PermitStatus = "CONTRACTOR_SIGNED";
        const hist = addHistory(document, "CONTRACTOR_SAFETY_MANAGER", document.contractorSafetyManagerName, "RESUBMIT", "재작성 후 서명 제출", true);
        const notifs = addNotification(
          { ...document, history: hist },
          "CONTROL_ROOM",
          "통제실 담당자",
          "[재제출] 작업허가서 재제출",
          `작업허가서(${document.permitNo})가 수정 후 재제출되었습니다.`,
          newStatus
        );

        set({
          document: {
            ...document,
            status: newStatus,
            contractorSignedAt: now(),
            rejectionReason: undefined,
            signatures: [...document.signatures, sigRec],
            history: hist,
            notifications: notifs,
          },
        });
      },

      // 연장 요청 → EXTENSION_REQUESTED
      requestExtension: (data) => {
        const { document } = get();
        if (!document) return;

        const ext: ExtensionRequest = {
          ...data,
          id: uid(),
          requestedAt: now(),
          status: "PENDING",
        };

        const newStatus: PermitStatus = "EXTENSION_REQUESTED";
        const hist = addHistory(document, "CONTRACTOR_SAFETY_MANAGER", document.contractorSafetyManagerName, "EXTENSION_REQUEST", "연장 요청", false, {
          comment: `연장 요청 종료: ${data.requestedEndAt}, 사유: ${data.reason}`,
        });
        const notifs = addNotification(
          { ...document, history: hist },
          "FACILITY_MANAGER",
          "관리소장",
          "[연장요청] 작업 연장 승인 요청",
          `작업허가서(${document.permitNo}) 연장 요청이 접수되었습니다. 승인을 진행해 주세요.`,
          newStatus
        );

        set({
          document: {
            ...document,
            status: newStatus,
            extensionRequests: [...document.extensionRequests, ext],
            history: hist,
            notifications: notifs,
          },
        });
      },

      // 연장 승인 → EXTENSION_APPROVED
      approveExtension: (signature) => {
        const { document } = get();
        if (!document) return;

        const pendingExt = document.extensionRequests.find((e) => e.status === "PENDING");
        if (!pendingExt) return;

        const updatedExt: ExtensionRequest = {
          ...pendingExt,
          status: "APPROVED",
          approvedBy: "오소장",
          approvedSignatureDataUrl: signature,
          approvedAt: now(),
        };

        const newStatus: PermitStatus = "EXTENSION_APPROVED";
        const hist = addHistory(document, "FACILITY_MANAGER", "오소장", "EXTENSION_APPROVE", "연장 승인", false);
        const notifs = addNotification(
          { ...document, history: hist },
          "CONTRACTOR_SAFETY_MANAGER",
          document.contractorSafetyManagerName,
          "[연장승인] 작업 연장 승인 완료",
          `작업 연장이 승인되었습니다. 새 종료 시각: ${pendingExt.requestedEndAt}`,
          newStatus
        );

        set({
          document: {
            ...document,
            status: newStatus,
            extendedWorkEndAt: pendingExt.requestedEndAt,
            extensionRequests: document.extensionRequests.map((e) =>
              e.id === pendingExt.id ? updatedExt : e
            ),
            history: hist,
            notifications: notifs,
          },
        });
      },

      // 연장 반려 → EXTENSION_REJECTED
      rejectExtension: (reason) => {
        const { document } = get();
        if (!document) return;

        const pendingExt = document.extensionRequests.find((e) => e.status === "PENDING");
        if (!pendingExt) return;

        const updatedExt: ExtensionRequest = {
          ...pendingExt,
          status: "REJECTED",
          rejectedReason: reason,
        };

        const newStatus: PermitStatus = "EXTENSION_REJECTED";
        const hist = addHistory(document, "FACILITY_MANAGER", "오소장", "EXTENSION_REJECT", "연장 반려", false, {
          rejectionReason: reason,
        });
        const notifs = addNotification(
          { ...document, history: hist },
          "CONTRACTOR_SAFETY_MANAGER",
          document.contractorSafetyManagerName,
          "[연장반려] 작업 연장 반려",
          `작업 연장이 반려되었습니다. 사유: ${reason}`,
          newStatus
        );

        set({
          document: {
            ...document,
            status: newStatus,
            extensionRequests: document.extensionRequests.map((e) =>
              e.id === pendingExt.id ? updatedExt : e
            ),
            history: hist,
            notifications: notifs,
          },
        });
      },

      // 작업완료 확인 (시공사) → CONTRACTOR_COMPLETION_SIGNED
      contractorCompleteWork: (completion) => {
        const { document } = get();
        if (!document) return;

        const newStatus: PermitStatus = "CONTRACTOR_COMPLETION_SIGNED";
        const hist = addHistory(document, "CONTRACTOR_SAFETY_MANAGER", document.contractorSafetyManagerName, "COMPLETION_SIGN", "작업완료 확인 서명", true);
        const notifs = addNotification(
          { ...document, history: hist },
          "CONTROL_ROOM",
          "통제실 담당자",
          "[완료확인요청] 통제실 완료 확인 요청",
          `작업허가서(${document.permitNo}) 시공사 완료 확인이 완료되었습니다. 통제실 확인 서명이 필요합니다.`,
          newStatus
        );

        set({
          document: {
            ...document,
            status: newStatus,
            actualCompletedAt: completion.actualCompletedAt,
            completion: {
              ...completion,
              contractorSignedAt: now(),
            },
            history: hist,
            notifications: notifs,
          },
        });
      },

      // 통제실 완료 확인 서명 → CONTROL_ROOM_COMPLETION_SIGNED
      controlRoomCompleteSign: (signature) => {
        const { document } = get();
        if (!document || !document.completion) return;

        const sigRec: SignatureRecord = {
          id: uid(),
          stepCode: "CONTROL_ROOM_COMPLETION_SIGN",
          signerRole: "CONTROL_ROOM",
          signerName: "박통제",
          signatureDataUrl: signature,
          signedAt: now(),
          meaning: "통제실 작업완료 확인 서명",
        };

        const newStatus: PermitStatus = "CONTROL_ROOM_COMPLETION_SIGNED";
        const hist = addHistory(document, "CONTROL_ROOM", "박통제", "COMPLETION_SIGN", "통제실 완료 확인 서명", true);
        const notifs = addNotification(
          { ...document, history: hist },
          "FACILITY_MANAGER",
          "관리소장",
          "[최종완료확인] 관리소장 최종 완료 확인 요청",
          `작업허가서(${document.permitNo}) 통제실 확인이 완료되었습니다. 관리소장 최종 확인이 필요합니다.`,
          newStatus
        );

        set({
          document: {
            ...document,
            status: newStatus,
            completion: {
              ...document.completion,
              controlRoomSignatureDataUrl: signature,
              controlRoomSignedAt: now(),
            },
            signatures: [...document.signatures, sigRec],
            history: hist,
            notifications: notifs,
          },
        });
      },

      // 관리소장 최종 완료 확인 → LOCKED
      facilityManagerFinalComplete: () => {
        const { document } = get();
        if (!document || !document.completion) return;

        const newStatus: PermitStatus = "LOCKED";
        const lockedAt = now();
        const hist = addHistory(document, "FACILITY_MANAGER", "오소장", "FINAL_COMPLETE", "최종 완료 확인 및 문서 잠금", false);

        set({
          document: {
            ...document,
            status: newStatus,
            isLocked: true,
            lockedAt,
            completion: {
              ...document.completion,
              managerFinalConfirmedAt: lockedAt,
              lockedAt,
            },
            history: hist,
          },
        });
      },
    }),
    {
      name: "ptw-approval-store",
      storage: createJSONStorage(() =>
        typeof window !== "undefined" ? localStorage : ({} as Storage)
      ),
    }
  )
);
