import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-auth',
  imports: [CommonModule, FormsModule],
  templateUrl: './auth.html',
  styleUrl: './auth.css',
})
export class AuthComponent {
  isLoginMode = signal<boolean>(true);
  email = signal<string>('');
  password = signal<string>('');
  isLoading = signal<boolean>(false);
  errorMessage = signal<string>('');
  successMessage = signal<string>('');

  constructor(private authService: AuthService) {}

  toggleMode() {
    this.isLoginMode.set(!this.isLoginMode());
    this.errorMessage.set('');
    this.successMessage.set('');
  }

  async onSubmit() {
    this.isLoading.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    const email = this.email();
    const password = this.password();

    if (!email || !password) {
      this.errorMessage.set('Please enter both email and password');
      this.isLoading.set(false);
      return;
    }

    try {
      if (this.isLoginMode()) {
        const { error } = await this.authService.signIn(email, password);
        if (error) {
          this.errorMessage.set(error.message || 'Failed to sign in');
        }
      } else {
        const { error } = await this.authService.signUp(email, password);
        if (error) {
          this.errorMessage.set(error.message || 'Failed to sign up');
        } else {
          this.successMessage.set('Account created! Please check your email to verify your account.');
        }
      }
    } catch (error: any) {
      this.errorMessage.set(error.message || 'An unexpected error occurred');
    } finally {
      this.isLoading.set(false);
    }
  }

  async signOut() {
    this.isLoading.set(true);
    const { error } = await this.authService.signOut();
    if (error) {
      this.errorMessage.set(error.message || 'Failed to sign out');
    }
    this.isLoading.set(false);
  }
}

