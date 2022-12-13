import { Role } from '../enums/role.enum';

export type User = {
  username: string;
  password: string;
  balance: number;
  stocks: Record<string, number>;
  roles: [Role];
};
