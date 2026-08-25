export interface UserRegistrationFormData {
  firstName: string;
  lastName: string;
  emailAddress: string;
  password?: string;
  genderOption?: string;
  countryName?: string;
  agreeToTerms?: boolean;
}

export interface UserRegistrationPageInterface {
  navigateToRegistrationPage(): Promise<void>;
  enterRegistrationDetails(details: UserRegistrationFormData): Promise<void>;
  submitRegistration(): Promise<void>;
  verifyRegistrationSuccess(expectedMessage: string): Promise<void>;
}
