export type UserRole = 'user' | 'admin';

export type SANGStatus = 'pending' | 'active' | 'completed' | 'suspended';

export type PaymentStatus = 'paid' | 'pending' | 'late' | 'reviewing';

export type TurnAssignment = 'random' | 'manual';

export type Frequency = 'weekly' | 'biweekly' | 'monthly';

export interface User {
  id: string;
  email: string;
  fullName: string;
  phoneNumber: string;
  role: UserRole;
  reputationScore: number;
  createdAt: Date;
  avatarUrl?: string;
  bankName?: string;
  accountType?: string;
  accountNumber?: string;
  cedula?: string;
  tutorialSeen?: boolean;
}

export interface SANG {
  id: string;
  name: string;
  contributionAmount: number;
  frequency: Frequency;
  numberOfParticipants: number;
  startDate: Date;
  turnAssignment: TurnAssignment;
  organizerId: string;
  status: SANGStatus;
  inviteCode: string;
  createdAt: Date;

  currentTurn: number;
  payoutStatus?: 'collecting' | 'paid_out';
  lastPayoutProofUrl?: string;
}

export interface SANGMember {
  id: string;
  sangId: string;
  userId: string;
  turnNumber: number;
  status: 'pending' | 'approved' | 'rejected';
  joinedAt: Date;
  name?: string;
  paymentStatus?: PaymentStatus;
  role?: string;
  paymentProofUrl?: string;
  lastPaymentDate?: Date;
}

export interface Payment {
  id: string;
  sangId: string;
  userId: string;
  turnNumber: number;
  amount: number;
  status: PaymentStatus;
  proofUrl?: string;
  dueDate: Date;
  paidAt?: Date;
}

export interface ReputationLog {
  id: string;
  userId: string;
  change: number;
  reason: string;
  sangId?: string;
  createdAt: Date;
}

export interface AdminLog {
  id: string;
  adminId: string;
  action: string;
  targetType: 'user' | 'sang' | 'payment';
  targetId: string;
  details?: string;
  createdAt: Date;
}

// Dashboard types
export interface DashboardStats {
  activeSangs: number;
  upcomingPayment?: {
    sangName: string;
    amount: number;
    dueDate: Date;
  };
  nextPayout?: {
    sangName: string;
    amount: number;
    date: Date;
  };
}

export interface AdminStats {
  totalUsers: number;
  activeSangs: number;
  completedSangs: number;
  monthlyVolume: number;
  latePaymentRatio: number;
  averageReputation: number;
}
