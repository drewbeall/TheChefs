// PROFILE.HTML JAVASCRIPT

//Function checks to see if the user is authenticated or not
//If not, they are redirected to the login page
//If so, the page loads as normal
async function auth(){
    const auth = await fetch('/api/v1/auth/heavy',{
        method: 'GET'        
    })
    const data = await auth.json();

    //If the session has expired, redirect to login page
    if (!data.ok) {
        window.location.href = '/login';
    }
}

async function loadSavedRecipies(){

} 




document.addEventListener('DOMContentLoaded', auth);
