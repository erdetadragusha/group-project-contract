(function(){
    const translations={
        en:{
            pageTitle:"Welcome | Group Project Contract",
            language:"Language",
            heading:"Group Project Contract",
            introduction:"Create your team and agree on how you will work together.",
            navigation:"Get started",
            signup:"Get started",
            login:"Log in"
        },
        hr:{
            pageTitle:"Dobro došli | Ugovor za grupni projekt",
            language:"Jezik",
            heading:"Ugovor za grupni projekt",
            introduction:"Stvorite svoj tim i dogovorite kako ćete zajedno raditi.",
            navigation:"Početak",
            signup:"Započni",
            login:"Prijavi se"
        },
        sq:{
            pageTitle:"Mirë se vini | Kontrata e projektit në grup",
            language:"Gjuha",
            heading:"Kontrata e projektit në grup",
            introduction:"Krijoni ekipin tuaj dhe bini dakord se si do të punoni së bashku.",
            navigation:"Filloni",
            signup:"Fillo",
            login:"Hyr"
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