import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

/** Compatibility redirect: /identity/users/:id → /settings/identity/users/:id */
@Component({
    selector: 'app-identity-user-redirect',
    standalone: true,
    template: ''
})
export class IdentityUserRedirect implements OnInit {
    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);

    ngOnInit(): void {
        const id = this.route.snapshot.paramMap.get('id');
        void this.router.navigate(['/settings/identity/users', id], { replaceUrl: true });
    }
}
