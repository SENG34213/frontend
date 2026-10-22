import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../shared/ui/toast/toast.service';
import { BadgeComponent } from '../../../shared/ui/badge/badge.component';
import { ButtonComponent } from '../../../shared/ui/button/button.component';

export interface FaqItem {
  id: string;
  category: 'bookings' | 'tournaments' | 'loyalty' | 'hardware';
  question: string;
  answer: string;
}

@Component({
  selector: 'gc-support',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    BadgeComponent,
    ButtonComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './support.component.html',
  styleUrl: './support.component.scss'
})
export class SupportComponent {
  private readonly fb = inject(FormBuilder);
  readonly authService = inject(AuthService);
  private readonly toast = inject(ToastService);

  readonly openFaqId = signal<string | null>('faq-1');
  readonly selectedFaqCategory = signal<string>('all');
  readonly isSubmitting = signal<boolean>(false);
  readonly submittedTicket = signal<{ id: string; category: string } | null>(null);

  readonly supportChannels = [
    {
      title: 'Telephone Hotline',
      value: '+94 21 222 5588',
      desc: 'Direct line to our lounge desk during open hours (10 AM – 11 PM).',
      action: 'Call Now',
      link: 'tel:+94212225588',
      icon: 'phone'
    },
    {
      title: 'WhatsApp Chat',
      value: '+94 77 123 4567',
      desc: 'Instant replies from lounge managers for quick slot checks and questions.',
      action: 'Open WhatsApp',
      link: 'https://wa.me/94771234567?text=Hello%20Gaming%20Castle%20Support',
      icon: 'whatsapp'
    },
    {
      title: 'Email Desk',
      value: 'support@gamingcastle.lk',
      desc: 'Official channel for payment queries, tournament appeals, and partnerships.',
      action: 'Send Email',
      link: 'mailto:support@gamingcastle.lk',
      icon: 'mail'
    },
    {
      title: 'Lounge Reception',
      value: 'Hospital Road, Jaffna',
      desc: 'Speak with our on-duty gaming marshals directly at the lounge counter.',
      action: 'View Location',
      link: '/location',
      icon: 'map'
    }
  ];

  readonly faqs: FaqItem[] = [
    {
      id: 'faq-1',
      category: 'bookings',
      question: 'How do I cancel or modify my station booking?',
      answer: 'You can view, cancel, or reschedule your session anytime from the "My Bookings" page. Cancellations made at least 2 hours before the start time receive a full refund or Castle Loyalty credits instantly.'
    },
    {
      id: 'faq-2',
      category: 'bookings',
      question: 'What happens if I arrive late for my booked slot?',
      answer: 'We provide a 15-minute grace period. If you arrive within 15 minutes of your slot time, your station is guaranteed. After 15 minutes, the slot may be released to waiting walk-in players.'
    },
    {
      id: 'faq-3',
      category: 'hardware',
      question: 'Can I bring my own DualSense controller or headset?',
      answer: 'Yes! You are welcome to bring your own official Sony DualSense controllers or 3.5mm headsets. Our gaming marshals will quickly assist with Bluetooth pairing. Note that third-party macro adapters (Cronus/XIM) are prohibited.'
    },
    {
      id: 'faq-4',
      category: 'tournaments',
      question: 'How are tournament brackets and prize pools handled?',
      answer: 'Tournament brackets are dynamically seeded and managed in real-time on our Tournaments page. Prize pools are disbursed via bank transfer, cash at counter, or Castle wallet within 24 hours of bracket completion.'
    },
    {
      id: 'faq-5',
      category: 'loyalty',
      question: 'How does the Castle Loyalty XP system work?',
      answer: 'Every booking and tournament registration earns you 10 XP per LKR 100 spent. As your total XP grows, you unlock higher tiers (Bronze, Silver, Gold, Platinum) with permanent booking discounts and cafe vouchers.'
    },
    {
      id: 'faq-6',
      category: 'hardware',
      question: 'What games are pre-installed on the PS5 consoles?',
      answer: 'All stations are pre-loaded with the latest competitive titles including EA Sports FC 24, Tekken 8, Mortal Kombat 1, NBA 2K24, Call of Duty: Warzone, Spider-Man 2, and Gran Turismo 7.'
    }
  ];

  readonly form = this.fb.group({
    name: [this.authService.currentUser()?.fullName || '', [Validators.required, Validators.minLength(2)]],
    email: [this.authService.currentUser()?.email || '', [Validators.required, Validators.email]],
    category: ['Booking Assistance', Validators.required],
    message: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(1000)]]
  });

  toggleFaq(faqId: string): void {
    this.openFaqId.update((current) => (current === faqId ? null : faqId));
  }

  setFaqCategory(cat: string): void {
    this.selectedFaqCategory.set(cat);
  }

  filteredFaqs(): FaqItem[] {
    const cat = this.selectedFaqCategory();
    if (cat === 'all') return this.faqs;
    return this.faqs.filter((f) => f.category === cat);
  }

  submitTicket(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);

    // Simulate async submission with realistic feedback
    setTimeout(() => {
      const randomTicketNum = Math.floor(1000 + Math.random() * 9000);
      const ticketId = `GC-${randomTicketNum}`;
      const category = this.form.value.category || 'General';

      this.isSubmitting.set(false);
      this.submittedTicket.set({ id: ticketId, category });
      this.toast.success(`Support ticket ${ticketId} created! Our team will respond shortly.`);
    }, 600);
  }

  resetForm(): void {
    this.submittedTicket.set(null);
    this.form.reset({
      name: this.authService.currentUser()?.fullName || '',
      email: this.authService.currentUser()?.email || '',
      category: 'Booking Assistance',
      message: ''
    });
  }
}
