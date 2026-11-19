export type UserRole = 'PARENT' | 'CARETAKER' | 'ADMIN';
export type VerificationStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type BookingStatus =
  | 'PENDING'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'CONFIRMED'
  | 'ACTIVE'
  | 'COMPLETED'
  | 'CANCELLED';

export interface User {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  role: UserRole;
  isEmailVerified: boolean;
  avatarUrl?: string | null;
  dzongkhag: string;
  address: string;
}

export interface CaretakerSummary {
  id: string;
  fullName: string;
  avatarUrl?: string | null;
  dzongkhag: string;
  address?: string;
  bio?: string;
  yearsExperience: number;
  qualifications: string;
  skills: string[];
  languages: string[];
  monthlyRateBtn: number;
  dailyRateBtn?: number | null;
  hourlyRateBtn?: number | null;
  verificationStatus: VerificationStatus;
  avgRating: number;
  totalReviews: number;
  isAvailable: boolean;
}

export interface ChildProfile {
  id: string;
  fullName: string;
  dateOfBirth: string;
  allergies?: string | null;
  medicalNotes?: string | null;
  specialInstructions?: string | null;
}

export interface BookingRecord {
  id: string;
  startDate: string;
  endDate: string;
  durationMonths: number;
  billingArrangement: 'MONTHLY_INSTALLMENT' | 'QUARTERLY_MILESTONE';
  agreedMonthlyRateBtn: number;
  estimatedTotalBtn: number;
  parentNotes?: string | null;
  status: BookingStatus;
  cancellationReason?: string | null;
  createdAt: string;
  parentId: string;
  parentName: string;
  parentPhone: string;
  parentDzongkhag: string;
  caretakerId: string;
  caretakerName: string;
  caretakerAvatar?: string | null;
  caretakerDzongkhag: string;
  childId: string;
  childName: string;
  childDob: string;
  childAllergies?: string | null;
}

export interface AppNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  referenceId?: string | null;
  isRead: boolean;
  createdAt: string;
}
