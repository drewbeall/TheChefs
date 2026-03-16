async function setNavbar() {

                //Creates the base navbar
                const navbar = document.createElement('nav');
                navbar.className = 'navbar navbar-expand-lg bg-body-secondary shadow-sm';
                navbar.style = 'padding: 0.5rem 0; font-weight: bold; font-size: medium';
                navbar.innerHTML = `
                <div class="container-fluid">
                    <a class="navbar-brand" href="">The Chefs</a>
                        <ul class="navbar-nav me-auto mb-2 mb-lg-0">
                            <li class="nav-item">
                            <a class="nav-link" href="/">Home</a>
                            </li>
                            <li class="nav-item">
                            <a class="nav-link" href="/feed">Feed</a>
                            </li>
                            
                        </ul>
                        <ul class="navbar-nav ms-auto" id="userNav"></ul>
                </div>
                `;

                //Appends the base navbar to the beginning of the body
                const body = document.querySelector('body');
                body.prepend(navbar);


                const list = document.getElementById('userNav')

                const response = await fetch('/api/v1/auth/light',{
                    method: 'GET',
                    headers: {'Content-Type': 'application/json'}
                });

                const data = await response.json();
                console.log(data.ok);
                if (!data.ok) {
                    list.innerHTML = `
                    <li class="nav-item">
                        <a class="nav-link" href="/login">Login</a>
                    </li>
                    <li class="nav-item">
                        <a class="nav-link" >/</a>
                    </li>
                    <li class="nav-item">
                        <a class="nav-link" href="/register">Register</a>
                    </li>`;
                }
                else {
                    list.innerHTML = `
                    <li class="nav-item">
                        <a class="nav-link" href="/profile">Profile</a>
                    </li>
                    <li class="nav-item">
                        <a class="nav-link" >/</a>
                    </li>
                    <li class="nav-item">
                        <a class="nav-link" href="/logout">Logout</a>
                    </li>`;
                }

                // Disable the nav link that matches the current page
                const currentPath = window.location.pathname;
                document.querySelectorAll('.navbar .nav-link').forEach(link => {
                    const href = link.getAttribute('href');
                    if (href && href !== '' && currentPath === href) {
                        link.classList.add('disabled');
                        link.setAttribute('aria-current', 'page');
                    } else if (href && href !== '') {
                        link.classList.remove('disabled');
                        link.removeAttribute('aria-current');
                    }
                });

            }
document.addEventListener('DOMContentLoaded', setNavbar);
