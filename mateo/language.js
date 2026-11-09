(function(){
    const translations={
        en:{
            pageTitle:"Welcome | Group Project Contract",
            signupTitle:"Sign up | Group Project Contract",
            loginTitle:"Log in | Group Project Contract",
            language:"Language",
            heading:"Group Project Contract",
            introduction:"Create your team and agree on how you will work together.",
            navigation:"Get started",
            signup:"Get started",
            login:"Log in",
            backWelcome:"Back to welcome",
            createAccount:"Create an account",
            signupIntroduction:"Sign up to start working with your team.",
            fullName:"Full name",
            email:"Email",
            password:"Password",
            passwordHelp:"Use at least 8 characters.",
            signupButton:"Sign up",
            alreadyAccount:"Already have an account?",
            loginIntroduction:"Continue working with your team.",
            noAccount:"Don't have an account?",
            nameRequired:"Please enter your name.",
            creatingAccount:"Creating your account...",
            checkEmail:"Check your email for a confirmation link. If joining a team, reopen your invitation link after confirming.",
            existingAccount:"Check your email for a confirmation link. If you already have an account, use Log in.",
            signupConnection:"Could not reach the signup service. Check your connection and try again.",
            loggingIn:"Logging in...",
            loginConnection:"Could not reach the login service. Check your connection and try again.",
            invalidLogin:"Incorrect email or password.",
            emailUnconfirmed:"Please confirm your email before logging in.",
            alreadyRegistered:"An account already exists for this email. Please log in.",
            rateLimit:"Too many requests. Please wait before trying again.",
            signupDisabled:"Account registration is currently unavailable.",
            requestFailed:"The request could not be completed. Please try again.",
            fieldRequired:"Please fill in this field.",
            validEmail:"Please enter a valid email address.",
            shortPassword:"Use at least 8 characters."
        },
        hr:{
            pageTitle:"Dobro došli | Ugovor za grupni projekt",
            signupTitle:"Registracija | Ugovor za grupni projekt",
            loginTitle:"Prijava | Ugovor za grupni projekt",
            language:"Jezik",
            heading:"Ugovor za grupni projekt",
            introduction:"Stvorite svoj tim i dogovorite kako ćete zajedno raditi.",
            navigation:"Početak",
            signup:"Započni",
            login:"Prijavi se",
            backWelcome:"Natrag na početnu stranicu",
            createAccount:"Izradite račun",
            signupIntroduction:"Registrirajte se kako biste započeli rad sa svojim timom.",
            fullName:"Ime i prezime",
            email:"E-pošta",
            password:"Lozinka",
            passwordHelp:"Upotrijebite najmanje 8 znakova.",
            signupButton:"Registriraj se",
            alreadyAccount:"Već imate račun?",
            loginIntroduction:"Nastavite raditi sa svojim timom.",
            noAccount:"Nemate račun?",
            nameRequired:"Unesite svoje ime i prezime.",
            creatingAccount:"Izrada računa...",
            checkEmail:"Provjerite e-poštu i otvorite poveznicu za potvrdu. Ako se pridružujete timu, nakon potvrde ponovno otvorite pozivnicu.",
            existingAccount:"Provjerite e-poštu i otvorite poveznicu za potvrdu. Ako već imate račun, prijavite se.",
            signupConnection:"Povezivanje s uslugom registracije nije uspjelo. Provjerite vezu i pokušajte ponovno.",
            loggingIn:"Prijava u tijeku...",
            loginConnection:"Povezivanje s uslugom prijave nije uspjelo. Provjerite vezu i pokušajte ponovno.",
            invalidLogin:"Netočna adresa e-pošte ili lozinka.",
            emailUnconfirmed:"Potvrdite adresu e-pošte prije prijave.",
            alreadyRegistered:"Račun s ovom adresom e-pošte već postoji. Prijavite se.",
            rateLimit:"Previše zahtjeva. Pričekajte prije ponovnog pokušaja.",
            signupDisabled:"Registracija računa trenutačno nije dostupna.",
            requestFailed:"Zahtjev nije moguće dovršiti. Pokušajte ponovno.",
            fieldRequired:"Ispunite ovo polje.",
            validEmail:"Unesite valjanu adresu e-pošte.",
            shortPassword:"Upotrijebite najmanje 8 znakova."
        },
        sq:{
            pageTitle:"Mirë se vini | Kontrata e projektit në grup",
            signupTitle:"Regjistrimi | Kontrata e projektit në grup",
            loginTitle:"Hyrja | Kontrata e projektit në grup",
            language:"Gjuha",
            heading:"Kontrata e projektit në grup",
            introduction:"Krijoni ekipin tuaj dhe bini dakord se si do të punoni së bashku.",
            navigation:"Filloni",
            signup:"Fillo",
            login:"Hyr",
            backWelcome:"Kthehu në faqen kryesore",
            createAccount:"Krijoni një llogari",
            signupIntroduction:"Regjistrohuni për të filluar punën me ekipin tuaj.",
            fullName:"Emri dhe mbiemri",
            email:"Email",
            password:"Fjalëkalimi",
            passwordHelp:"Përdorni të paktën 8 karaktere.",
            signupButton:"Regjistrohu",
            alreadyAccount:"Keni tashmë një llogari?",
            loginIntroduction:"Vazhdoni punën me ekipin tuaj.",
            noAccount:"Nuk keni llogari?",
            nameRequired:"Shkruani emrin dhe mbiemrin tuaj.",
            creatingAccount:"Duke krijuar llogarinë...",
            checkEmail:"Kontrolloni emailin për lidhjen e konfirmimit. Nëse po bashkoheni me një ekip, hapni përsëri lidhjen e ftesës pas konfirmimit.",
            existingAccount:"Kontrolloni emailin për lidhjen e konfirmimit. Nëse keni tashmë një llogari, hyni.",
            signupConnection:"Nuk u lidhëm me shërbimin e regjistrimit. Kontrolloni lidhjen dhe provoni përsëri.",
            loggingIn:"Duke hyrë...",
            loginConnection:"Nuk u lidhëm me shërbimin e hyrjes. Kontrolloni lidhjen dhe provoni përsëri.",
            invalidLogin:"Emaili ose fjalëkalimi është i pasaktë.",
            emailUnconfirmed:"Konfirmoni emailin përpara se të hyni.",
            alreadyRegistered:"Një llogari me këtë email ekziston tashmë. Ju lutemi hyni.",
            rateLimit:"Shumë kërkesa. Prisni përpara se të provoni përsëri.",
            signupDisabled:"Regjistrimi i llogarive aktualisht nuk është i disponueshëm.",
            requestFailed:"Kërkesa nuk mund të përfundohej. Provoni përsëri.",
            fieldRequired:"Plotësoni këtë fushë.",
            validEmail:"Shkruani një adresë emaili të vlefshme.",
            shortPassword:"Përdorni të paktën 8 karaktere."
        }
    };

    const messageKeys={
        "Please enter your name.":"nameRequired",
        "Creating your account...":"creatingAccount",
        "Check your email for a confirmation link. If joining a team, reopen your invitation link after confirming.":"checkEmail",
        "Check your email for a confirmation link. If you already have an account, use Log in.":"existingAccount",
        "Could not reach the signup service. Check your connection and try again.":"signupConnection",
        "Logging in...":"loggingIn",
        "Could not reach the login service. Check your connection and try again.":"loginConnection",
        "Invalid login credentials":"invalidLogin",
        "Email not confirmed":"emailUnconfirmed",
        "User already registered":"alreadyRegistered",
        "Email rate limit exceeded":"rateLimit",
        "Request rate limit reached":"rateLimit",
        "Signup is disabled":"signupDisabled",
        "Signups not allowed for this instance":"signupDisabled"
    };

    const languageSelect=document.querySelector("#language-select");

    const messageElements=document.querySelectorAll(
        "#signup-message,#login-message"
    );

    const accountInputs=document.querySelectorAll(
        "#signup-form input,#login-form input"
    );

    const messageState=new WeakMap();

    let language="en";

    try{
        const savedLanguage=localStorage.getItem("appLanguage");

        if(Object.hasOwn(translations,savedLanguage)){
            language=savedLanguage;
        }
    }catch(error){
        language="en";
    }

    function translateMessage(element){
        const text=element.textContent.trim();

        if(text===""){
            messageState.delete(element);
            return;
        }

        const savedKey=messageState.get(element);

        if(savedKey && text===translations[language][savedKey]){
            return;
        }

        const key=Object.hasOwn(messageKeys,text)
            ? messageKeys[text]
            : "requestFailed";

        messageState.set(element,key);

        const translated=translations[language][key];

        if(element.textContent!==translated){
            element.textContent=translated;
        }
    }

    function applyLanguage(){
        const labels=translations[language];

        document.documentElement.lang=language;

        document.querySelectorAll("[data-i18n]").forEach(function(element){
            const key=element.getAttribute("data-i18n");

            if(Object.hasOwn(labels,key)){
                element.textContent=labels[key];
            }
        });

        document.querySelectorAll("[data-i18n-aria]").forEach(function(element){
            const key=element.getAttribute("data-i18n-aria");

            if(Object.hasOwn(labels,key)){
                element.setAttribute("aria-label",labels[key]);
            }
        });

        messageElements.forEach(function(element){
            const key=messageState.get(element);

            if(key){
                const translated=labels[key];

                if(element.textContent!==translated){
                    element.textContent=translated;
                }
            }else{
                translateMessage(element);
            }
        });

        accountInputs.forEach(function(input){
            input.setCustomValidity("");
        });

        if(languageSelect){
            languageSelect.value=language;
        }
    }

    accountInputs.forEach(function(input){
        input.addEventListener("input",function(){
            input.setCustomValidity("");
        });

        input.addEventListener("invalid",function(){
            input.setCustomValidity("");

            const labels=translations[language];

            if(input.validity.valueMissing){
                input.setCustomValidity(labels.fieldRequired);
            }else if(input.validity.typeMismatch && input.type==="email"){
                input.setCustomValidity(labels.validEmail);
            }else if(input.validity.tooShort && input.type==="password"){
                input.setCustomValidity(labels.shortPassword);
            }
        });
    });

    if(languageSelect){
        languageSelect.addEventListener("change",function(){
            const selected=languageSelect.value;

            if(!Object.hasOwn(translations,selected)){
                return;
            }

            language=selected;
            applyLanguage();

            try{
                localStorage.setItem("appLanguage",language);
            }catch(error){
                // The language still changes if storage is unavailable.
            }
        });
    }

    applyLanguage();

    messageElements.forEach(function(element){
        const observer=new MutationObserver(function(){
            translateMessage(element);
        });

        observer.observe(element,{
            childList:true,
            characterData:true,
            subtree:true
        });
    });
})();