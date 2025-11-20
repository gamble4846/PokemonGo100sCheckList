import { Component, signal, effect } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from './services/auth.service';
import { AuthComponent } from './components/auth/auth';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, CommonModule, AuthComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  isAuthenticated = signal<boolean>(false);
  isLoading = signal<boolean>(true);

  constructor(private authService: AuthService) {
    // Watch for auth state changes
    effect(() => {
      this.isAuthenticated.set(this.authService.isAuthenticated());
      this.isLoading.set(this.authService.isLoading());
    });
  }

  async signOut() {
    await this.authService.signOut();
  }
}
