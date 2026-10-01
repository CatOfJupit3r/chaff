import { container } from 'tsyringe';

import { AuthService } from '@~/features/auth/auth.service';

export default async function authLoader() {
  const authService = container.resolve(AuthService);

  authService.connect();

  return authService.getInstance();
}
