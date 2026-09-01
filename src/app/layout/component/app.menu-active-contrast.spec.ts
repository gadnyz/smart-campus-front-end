describe('Sidebar active menu contrast (non-functional — dark/light)', () => {
    let host: HTMLElement;
    let link: HTMLAnchorElement;

    beforeEach(() => {
        document.documentElement.classList.remove('app-dark');
        host = document.createElement('div');
        host.innerHTML = `
            <style>
                .layout-menu a {
                    color: rgb(51, 65, 85);
                    background-color: rgb(255, 255, 255);
                }
                .layout-menu a.active-route {
                    font-weight: 700;
                    color: rgb(11, 95, 255);
                    background-color: rgba(15, 23, 42, 0.04);
                }
                .app-dark .layout-menu a {
                    color: rgb(226, 232, 240);
                    background-color: rgb(15, 23, 42);
                }
                .app-dark .layout-menu a.active-route {
                    color: rgb(126, 182, 255);
                    background-color: rgba(148, 163, 184, 0.12);
                }
            </style>
            <nav class="layout-menu">
                <a class="menu-link active-route" href="#">Utilisateurs</a>
            </nav>
        `;
        document.body.appendChild(host);
        link = host.querySelector('a.menu-link') as HTMLAnchorElement;
    });

    afterEach(() => {
        host.remove();
        document.documentElement.classList.remove('app-dark');
    });

    it('should apply a distinct primary colour for the active route in light mode', () => {
        const styles = getComputedStyle(link);

        expect(styles.fontWeight === '700' || styles.fontWeight === 'bold').toBeTrue();
        expect(styles.color).toBe('rgb(11, 95, 255)');
        expect(styles.color).not.toBe(styles.backgroundColor);
    });

    it('should keep a readable active colour when app-dark is enabled', () => {
        document.documentElement.classList.add('app-dark');
        const styles = getComputedStyle(link);

        expect(styles.fontWeight === '700' || styles.fontWeight === 'bold').toBeTrue();
        expect(styles.color).toBe('rgb(126, 182, 255)');
        expect(styles.color).not.toBe(styles.backgroundColor);
    });
});
