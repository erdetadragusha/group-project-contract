const signupForm=document.querySelector("#signup-form");

if(signupForm){
    signupForm.addEventListener("submit",function(event){
        event.preventDefault();

        const message=document.querySelector("#signup-message");

        message.textContent="Account creation is not connected yet. Your account has not been saved.";
    });
}