import { Component, ChangeDetectionStrategy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { BadgeComponent } from '../../../shared/ui/badge/badge.component';
import { ButtonComponent } from '../../../shared/ui/button/button.component';

export interface PolicySection {
  id: string;
  title: string;
  badge: string;
  summary: string;
  bullets: string[];
}

@Component({
  selector: 'gc-privacy',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    BadgeComponent,
    ButtonComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './privacy.component.html',
  styleUrl: './privacy.component.scss'
})
export class PrivacyComponent {
  readonly lastUpdated = 'October 2026';
  readonly version = '2.4';
  readonly activeSectionId = signal<string>('collection');

  readonly highlights = [
    {
      title: 'Zero Ad Tracking',
      desc: 'We never sell your phone number, email, or gaming session logs to marketing brokers.',
      icon: 'shield'
    },
    {
      title: 'Bank-Grade Payment Security',
      desc: 'Credit/debit card numbers are never stored on our servers; handled strictly by PCI-DSS gateways.',
      icon: 'lock'
    },
    {
      title: 'Real-Time Data Control',
      desc: 'Full transparency over tournament brackets, loyalty points, and account deletion rights.',
      icon: 'user'
    },
    {
      title: 'Encrypted In Transit & At Rest',
      desc: 'TLS 1.3 cryptographic protection for all web traffic and database session persistence.',
      icon: 'key'
    }
  ];

  readonly sections: PolicySection[] = [
    {
      id: 'collection',
      title: '1. Information We Collect',
      badge: 'DATA INGESTION',
      summary: 'Gaming Castle Jaffna gathers limited personal and session data essential for booking consoles, managing tournaments, and authenticating user sessions.',
      bullets: [
        'Personal Identity: Full Name, email address, contact telephone number, and hashed authentication credentials.',
        'Booking & Station Logs: Station ID reserved, start and end times, gameplay duration, and booking statuses.',
        'Tournament & Competitive Data: In-game gamertag/handle, match scores, seeds, and tournament standings.',
        'Telemetry & Fraud Prevention: IP address, user-agent details, and rate-limiting audit logs for account security.'
      ]
    },
    {
      id: 'usage',
      title: '2. How We Use Your Information',
      badge: 'PURPOSE & LEGAL BASIS',
      summary: 'Data is strictly utilized to operate our lounge booking management platform and deliver high-performance esports experiences.',
      bullets: [
        'Station Scheduling: Confirming reservations, station allocations, and preventing double bookings.',
        'Automated Alerts: Sending booking confirmation emails, SMS/WhatsApp arrival reminders, and bracket start callouts.',
        'Loyalty & Rewards: Calculating Castle XP points balance, milestone badges, and tier upgrade benefits.',
        'Dispute Resolution: Verifying payment reconciliation and tournament match integrity.'
      ]
    },
    {
      id: 'payments',
      title: '3. Payment & Financial Data Protection',
      badge: 'FINANCIAL INTEGRITY',
      summary: 'Your financial security is our highest priority. We do not store, view, or process raw card numbers.',
      bullets: [
        'PCI-DSS Compliance: All online transactions (Visa, MasterCard, LankaQR) are processed directly by certified third-party payment gateways (PayHere / Stripe).',
        'Tokenization: Payment references are pseudonymously tokenized so refunds can be executed securely.',
        'Cash & Desk Transactions: On-premises cash and POS transactions are recorded solely for receipt generation and customer billing history.'
      ]
    },
    {
      id: 'rights',
      title: '4. Your Privacy Rights & Data Control',
      badge: 'PLAYER RIGHTS',
      summary: 'Every customer retains complete control over their personal gaming record and contact preferences.',
      bullets: [
        'Right to Access: View and download your complete booking and tournament participation history from your Profile.',
        'Right to Rectification: Easily update phone numbers, avatar images, and display names directly via the account drawer.',
        'Right to Erasure (Be Forgotten): You may request the permanent deletion of your account and personal identifiers by contacting privacy@gamingcastle.lk.',
        'Opt-Out: Unsubscribe from non-essential promotional communications with a single click in your settings.'
      ]
    },
    {
      id: 'retention',
      title: '5. Data Retention & Safeguards',
      badge: 'SECURITY AUDIT',
      summary: 'Session data is retained only for active operational necessity and audit compliance.',
      bullets: [
        'Inactive accounts are preserved for 24 months before automatic archival unless deletion is requested earlier.',
        'Password hashes utilize salted bcrypt with high cost factors to safeguard against credential stuffing.',
        'Access to administration user records is restricted by role-based access control (RBAC) and logged with immutable timestamps.'
      ]
    }
  ];

  scrollToSection(sectionId: string): void {
    this.activeSectionId.set(sectionId);
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
}
