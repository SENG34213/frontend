import { Component, ChangeDetectionStrategy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { BadgeComponent } from '../../../shared/ui/badge/badge.component';
import { ButtonComponent } from '../../../shared/ui/button/button.component';

export interface TermRule {
  number: string;
  category: string;
  title: string;
  description: string;
  clauses: string[];
}

@Component({
  selector: 'gc-terms',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    BadgeComponent,
    ButtonComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './terms.component.html',
  styleUrl: './terms.component.scss'
})
export class TermsComponent {
  readonly lastUpdated = 'October 2026';
  readonly version = '2.0';
  readonly selectedCategory = signal<string>('all');

  readonly categories = [
    { id: 'all', label: 'All Terms' },
    { id: 'bookings', label: 'Bookings & Timing' },
    { id: 'hardware', label: 'Console & Hardware Care' },
    { id: 'esports', label: 'Fair Play & Tournaments' },
    { id: 'lounge', label: 'Lounge Etiquette' }
  ];

  readonly rules: TermRule[] = [
    {
      number: '01',
      category: 'bookings',
      title: 'Station Reservations, Punctuality & Grace Period',
      description: 'Policies governing advance slot bookings, cancellations, check-in requirements, and walk-in allowances.',
      clauses: [
        'Check-In Requirement: Players must check in at the front reception at least 10 minutes prior to their booked session start time.',
        '15-Minute Grace Period: Reserved stations will be held for exactly 15 minutes past start time. Unclaimed slots after 15 minutes are automatically forfeited and may be released to waiting walk-in players.',
        'Cancellation & Rescheduling: Cancellations processed 2 hours or more prior to slot time receive a 100% refund or Castle credit. Late cancellations within 2 hours are subject to a 50% reservation fee.',
        'Extended Sessions: Session extensions are subject to station availability and can be requested directly through the counter staff.'
      ]
    },
    {
      number: '02',
      category: 'hardware',
      title: 'Console, Display & DualSense Hardware Responsibility',
      description: 'Guidelines ensuring all players enjoy pristine, perfectly calibrated gaming hardware in a safe environment.',
      clauses: [
        'Hardware Inspection: Stations and controllers are inspected and sanitized prior to every session. Players should report any pre-existing issue immediately upon sitting down.',
        'Normal Wear vs. Negligence: Normal wear-and-tear is fully accommodated by Gaming Castle. Deliberate abuse, hitting controllers, throwing headsets, or liquid damage is strictly forbidden.',
        'Vandalism Restitution: In the event of intentional damage or destruction of equipment, the guest is financially responsible for the direct repair or replacement costs.',
        'Personal Peripherals: Players are allowed to connect their own 3.5mm headsets and official Sony DualSense controllers. Third-party macro or cheating dongles (Cronus, Titan, XIM) are strictly prohibited.'
      ]
    },
    {
      number: '03',
      category: 'esports',
      title: 'Esports Conduct, Fair Play & Tournament Integrity',
      description: 'Commitments to mutual respect, sporting behavior, and competitive fairness in all sanctioned brackets.',
      clauses: [
        'Respect & Community: Zero tolerance for harassment, racial slurs, physical intimidation, or hate speech. Friendly competitive banter is encouraged, but personal abuse will result in an immediate ejection.',
        'Tournament Match Rules: Official tournament games adhere to game publisher rulebooks (EA Sports FC 24, Tekken 8, Mortal Kombat 1). Match results verified by marshals are final.',
        'Cheating & Exploits: Any deliberate exploitation of known game crashes, pause abuse, or external interference results in immediate match disqualification and forfeiture of entry fees and prizes.',
        'Prize Payouts: Tournament cash prizes and Castle Loyalty XP are distributed within 24 hours of bracket finalization.'
      ]
    },
    {
      number: '04',
      category: 'lounge',
      title: 'Lounge Atmosphere, Cafe & Food Policy',
      description: 'Maintaining a clean, comfortable, and focused atmosphere for casual gamers and esports athletes alike.',
      clauses: [
        'Food & Beverage: Hot meals, messy finger foods, and uncovered drinks are restricted to the Castle Cafe lounge tables. Only covered beverage tumblers and bottles are permitted at console pods.',
        'Noise Levels: Please keep vocal enthusiasm reasonable or use the provided noise-isolating headsets to respect other players in adjacent pods.',
        'Age Policies: Players under 14 years old must be accompanied by an adult or have parental consent for sessions extending past 8:00 PM.',
        'Personal Belongings: Gaming Castle is not liable for unsecured personal devices. Free secure keylock lockers are available at reception upon request.'
      ]
    }
  ];

  filteredRules(): TermRule[] {
    const cat = this.selectedCategory();
    if (cat === 'all') return this.rules;
    return this.rules.filter((r) => r.category === cat);
  }

  setCategory(catId: string): void {
    this.selectedCategory.set(catId);
  }
}
