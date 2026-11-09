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
            noAccount:"Don't have an account?"
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
            noAccount:"Nemate račun?"
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
            noAccount:"Nuk keni llogari?"
        }
    };

    const languageSelect=document.querySelector("#language-select");
    let language="en";

    try{
        const savedLanguage=localStorage.getItem("appLanguage");

        if(Object.hasOwn(translations,savedLanguage)){
            language=savedLanguage;
        }
    }catch(error){
        language="en";
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

        if(languageSelect){
            languageSelect.value=language;
        }
    }

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
})();