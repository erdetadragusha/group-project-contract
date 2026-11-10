(async function(){
    const selector=document.querySelector("#language-select");
    const message=document.querySelector("#language-message");
    const languages=["en","hr","sq"];

    selector.disabled=true;

    function updateText(){
        document.documentElement.lang=i18next.resolvedLanguage;
        document.documentElement.dir="ltr";

        document.querySelectorAll("[data-i18n]").forEach(function(element){
            const key=element.getAttribute("data-i18n");
            element.textContent=i18next.t(key);
        });

        document.querySelectorAll("[data-i18n-aria]").forEach(function(element){
            const key=element.getAttribute("data-i18n-aria");
            element.setAttribute("aria-label",i18next.t(key));
        });

        selector.value=i18next.resolvedLanguage;
    }

    try{
        const resources={};

        await Promise.all(languages.map(async function(language){
            const response=await fetch("locales/"+language+".json");

            if(!response.ok){
                throw new Error("Could not load locale: "+language);
            }

            resources[language]={
                translation:await response.json()
            };
        }));

        let savedLanguage="en";

        try{
            const saved=localStorage.getItem("appLanguage");

            if(languages.includes(saved)){
                savedLanguage=saved;
            }
        }catch(error){
            savedLanguage="en";
        }

        await i18next.init({
            lng:savedLanguage,
            supportedLngs:languages,
            fallbackLng:"en",
            resources:resources,
            interpolation:{
                escapeValue:false
            }
        });

        updateText();
        selector.disabled=false;
        message.hidden=true;

        selector.addEventListener("change",async function(){
            const selected=selector.value;

            if(!languages.includes(selected)){
                return;
            }

            await i18next.changeLanguage(selected);
            updateText();

            try{
                localStorage.setItem("appLanguage",selected);
            }catch(error){
                // The selected language still works without browser storage.
            }
        });
    }catch(error){
        console.error(error);
        message.hidden=false;
    }
})();