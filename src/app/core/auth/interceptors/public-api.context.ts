import { HttpContextToken } from '@angular/common/http';

export const PUBLIC_API_REQUEST = new HttpContextToken<boolean>(() => false);