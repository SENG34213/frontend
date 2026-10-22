import { Component, ChangeDetectionStrategy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { BadgeComponent } from '../../../shared/ui/badge/badge.component';
import { ButtonComponent } from '../../../shared/ui/button/button.component';

export interface StationFeature {
  icon: string;
  title: string;
  description: string;
  specs: string[];
}

@Component({
  selector: 'gc-location',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    BadgeComponent,
    ButtonComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './location.component.html',
  styleUrl: './location.component.scss'
})
export class LocationComponent {
  readonly address = 'No. 128 Hospital Road, Jaffna 40000, Sri Lanka';
  readonly phone = '+94 21 222 5588';
  readonly email = 'lounge@gamingcastle.lk';
  readonly activeTab = signal<'setup' | 'amenities' | 'transport'>('setup');

  readonly schedule = [
    { day: 'Monday – Thursday', hours: '10:00 AM – 10:30 PM', note: 'Standard Gaming Hours' },
    { day: 'Friday', hours: '10:00 AM – 12:00 Midnight', note: 'Late-Night Esports Battle' },
    { day: 'Saturday', hours: '09:30 AM – 12:00 Midnight', note: 'Weekend Tournaments & Rush' },
    { day: 'Sunday', hours: '09:30 AM – 10:30 PM', note: 'Casual Community Play' }
  ];

  readonly stationFeatures: StationFeature[] = [
    {
      icon: 'display',
      title: 'Sony Bravia 4K 120Hz Displays',
      description: 'Ultra-low response OLED and high-framerate screens equipped with HDMI 2.1 & VRR for tear-free competitive gameplay.',
      specs: ['4K Ultra HD', '120Hz Refresh Rate', 'HDR10 Support', 'Low Input Lag (<5ms)']
    },
    {
      icon: 'gamepad',
      title: 'PS5 Pro & DualSense Stations',
      description: 'Latest generation PlayStation 5 consoles with DualSense wireless controllers, customized grip sleeves, and sanitizing UV docks.',
      specs: ['PlayStation 5 Consoles', 'DualSense Haptic Feedback', 'DualSense Edge Controllers', 'Sanitized after every session']
    },
    {
      icon: 'headphones',
      title: 'Sony INZONE Wireless Headsets',
      description: 'Acoustic 360 spatial audio headsets with active noise cancelling so you hear every footstep, reload, and callout.',
      specs: ['360 Spatial Audio', 'Active Noise Cancelling', 'Boom Microphone', 'Memory Foam Ear Cushions']
    },
    {
      icon: 'network',
      title: 'Gigabit Low-Latency Fiber',
      description: 'Dedicated enterprise dual-WAN gigabit connections configured specifically for ultra-low ping to Asian and SEA game servers.',
      specs: ['1 Gbps Symmetric Fiber', 'Sub-25ms Ping to Singapore', 'Zero Packet Loss QOS', 'Redundant Failover Line']
    }
  ];

  readonly amenities = [
    { title: 'Air-Conditioned Comfort', desc: 'Climate-controlled lounge kept at a cool 20°C for peak focus during intense sessions.' },
    { title: 'Castle Cafe & Snack Bar', desc: 'Energizing cold coffees, mocktails, fresh juices, and gaming snacks delivered to your station.' },
    { title: 'Ergonomic Gaming Chairs', desc: 'Premium adjustable chairs with lumbar support for maximum posture comfort during long grinds.' },
    { title: 'Free Secure Parking', desc: 'Designated monitored parking area for two-wheelers and vehicles right outside the venue.' }
  ];

  openGoogleMaps(): void {
    window.open('https://maps.google.com/?q=Hospital+Road,+Jaffna,+Sri+Lanka', '_blank', 'noopener,noreferrer');
  }
}
