// Shared code for the Contract Management & Conflict Resolution pages (Andrej).
// Loads translations, checks login and team access, and offers small helpers
// for building the page, formatting values and showing loading / error states.
(function(){
    "use strict";

    const LANGUAGES=["en","hr","sq"];
    const HOLIDAY_API="https://date.nager.at/api/v3";
    const REQUEST_TIMEOUT=10000;
    const HOLIDAY_TIMEOUT=5000;
    const HOLIDAY_CACHE_TIME=12*60*60*1000;

    const params=new URLSearchParams(window.location.search);
    const teamId=params.get("teamId");

    const stateBox=document.querySelector("#state");
    const content=document.querySelector("#content");
    const selector=document.querySelector("#language-select");

    const context={teamId:teamId,user:null,team:null,members:[],contract:null};

    let page=null;
    let pageData=null;

    class AppError extends Error{
        constructor(code){
            super(code);
            this.code=code;
        }
    }

    // --- Translations -----------------------------------------------------

    function t(key,options){
        // i18next crashes on null options, so "no options" is passed as undefined.
        options=options || undefined;

        if(!i18next.exists(key,options)){
            console.warn("Missing translation:",key);
        }

        return i18next.t(key,options);
    }

    function language(){
        return i18next.resolvedLanguage || "en";
    }

    async function loadLocale(code){
        const controller=new AbortController();
        const timer=setTimeout(function(){
            controller.abort();
        },REQUEST_TIMEOUT);

        try{
            const response=await fetch("locales/"+code+".json",{
                signal:controller.signal
            });

            if(!response.ok){
                throw new Error("Could not load locale: "+code);
            }

            return await response.json();
        }finally{
            clearTimeout(timer);
        }
    }

    function savedLanguage(resources){
        try{
            const saved=localStorage.getItem("appLanguage");

            if(LANGUAGES.includes(saved) && resources[saved]){
                return saved;
            }
        }catch(error){
            // Storage can be blocked; English is used instead.
        }

        return "en";
    }

    async function startTranslations(){
        // English is required; the other languages fall back to it.
        const resources={en:{translation:await loadLocale("en")}};
        const others=LANGUAGES.filter(function(code){
            return code!=="en";
        });
        const results=await Promise.allSettled(others.map(loadLocale));

        results.forEach(function(result,index){
            if(result.status==="fulfilled"){
                resources[others[index]]={translation:result.value};
            }else{
                console.warn("Language unavailable:",others[index]);
            }
        });

        await i18next.init({
            lng:savedLanguage(resources),
            supportedLngs:LANGUAGES,
            fallbackLng:"en",
            resources:resources,
            interpolation:{escapeValue:false}
        });

        if(selector){
            Array.from(selector.options).forEach(function(option){
                option.disabled=!resources[option.value];
            });

            selector.value=language();
            selector.disabled=false;

            selector.addEventListener("change",async function(){
                if(!resources[selector.value]){
                    return;
                }

                await i18next.changeLanguage(selector.value);

                try{
                    localStorage.setItem("appLanguage",selector.value);
                }catch(error){
                    // The language still changes without storage.
                }
            });
        }

        i18next.on("languageChanged",function(){
            translatePage();

            if(page && pageData!==null && page.rerenderOnLanguage!==false){
                page.render(context,pageData);
            }
        });
    }

    function elementOptions(element){
        const options=element.getAttribute("data-i18n-options");

        if(!options){
            return undefined;
        }

        try{
            return JSON.parse(options);
        }catch(error){
            return undefined;
        }
    }

    // Fills every element that carries a translation key.
    function translatePage(){
        document.documentElement.lang=language();
        document.documentElement.dir="ltr";

        document.querySelectorAll("[data-i18n]").forEach(function(element){
            element.textContent=t(
                element.getAttribute("data-i18n"),
                elementOptions(element)
            );
        });

        document.querySelectorAll("[data-i18n-aria]").forEach(function(element){
            element.setAttribute(
                "aria-label",
                t(element.getAttribute("data-i18n-aria"))
            );
        });

        const heading=document.querySelector("h1[data-i18n]");

        if(heading){
            document.title=heading.textContent+" | "+t("app.name");
        }
    }

    // --- Building elements --------------------------------------------------

    // h("p",{i18n:["changes.count",{count:2}]}) creates <p> with translated
    // text. Text always goes through textContent, never innerHTML, so content
    // written by users cannot inject markup.
    function h(tag,attributes,...children){
        const element=document.createElement(tag);

        Object.entries(attributes || {}).forEach(function([name,value]){
            if(value===false || value===null || value===undefined){
                return;
            }

            if(name==="class"){
                element.className=value;
            }else if(name==="text"){
                element.textContent=value;
            }else if(name==="i18n"){
                const key=Array.isArray(value) ? value[0] : value;
                const options=Array.isArray(value) ? value[1] : undefined;

                element.setAttribute("data-i18n",key);

                if(options){
                    element.setAttribute(
                        "data-i18n-options",
                        JSON.stringify(options)
                    );
                }

                element.textContent=t(key,options);
            }else if(name==="ariaI18n"){
                element.setAttribute("data-i18n-aria",value);
                element.setAttribute("aria-label",t(value));
            }else if(name.startsWith("on")){
                element.addEventListener(name.slice(2),value);
            }else if(value===true){
                element.setAttribute(name,"");
            }else{
                element.setAttribute(name,value);
            }
        });

        children.flat().forEach(function(child){
            if(child===null || child===undefined || child===false){
                return;
            }

            element.append(
                child.nodeType ? child : document.createTextNode(String(child))
            );
        });

        return element;
    }

    // Replaces the children of an element. Like h(), it accepts lists and
    // skips empty values.
    function fill(element,...children){
        element.replaceChildren();

        children.flat(2).forEach(function(child){
            if(child===null || child===undefined || child===false){
                return;
            }

            element.append(
                child.nodeType ? child : document.createTextNode(String(child))
            );
        });
    }

    function url(file,extra){
        const query=new URLSearchParams({teamId:teamId || ""});

        Object.entries(extra || {}).forEach(function([key,value]){
            query.set(key,value);
        });

        return file+"?"+query.toString();
    }

    // Colour is never the only signal: each badge has text and its own shape.
    const BADGE_TONE={
        active:"ok",agreed:"ok",approved:"ok",resolved:"ok",accepted:"ok",
        pending:"warn",under_review:"warn",proposed:"warn",medium:"warn",
        rejected:"bad",open:"bad",high:"bad",
        low:"neutral",archived:"neutral"
    };

    function badge(value,group){
        return h("span",{class:"badge badge-"+(BADGE_TONE[value] || "neutral")},
            h("span",{class:"badge-shape","aria-hidden":"true"}),
            h("span",{i18n:(group || "state")+"."+value})
        );
    }

    // --- Formatting (always through Intl) -----------------------------------

    function isPlainDate(value){
        return /^\d{4}-\d{2}-\d{2}$/.test(value || "");
    }

    function formatDate(value,options){
        if(!value){
            return "";
        }

        // A plain date is a calendar day, not a moment, so it must not shift
        // with the time zone.
        const plain=isPlainDate(value);
        const date=new Date(plain ? value+"T00:00:00Z" : value);
        const settings=Object.assign({},options || {dateStyle:"medium"});

        if(plain){
            settings.timeZone="UTC";
        }

        return new Intl.DateTimeFormat(language(),settings).format(date);
    }

    function formatDateTime(value){
        return formatDate(value,{dateStyle:"medium",timeStyle:"short"});
    }

    function formatRelative(value){
        const seconds=(new Date(value).getTime()-Date.now())/1000;
        const formatter=new Intl.RelativeTimeFormat(language(),{numeric:"auto"});
        const units=[
            ["year",31536000],["month",2592000],["week",604800],
            ["day",86400],["hour",3600],["minute",60]
        ];

        for(const [unit,size] of units){
            if(Math.abs(seconds)>=size){
                return formatter.format(Math.round(seconds/size),unit);
            }
        }

        return formatter.format(0,"minute");
    }

    function formatPercent(value){
        return new Intl.NumberFormat(language(),{
            style:"percent",
            maximumFractionDigits:0
        }).format(value);
    }

    function today(){
        const now=new Date();

        return now.getFullYear()+"-"+
            String(now.getMonth()+1).padStart(2,"0")+"-"+
            String(now.getDate()).padStart(2,"0");
    }

    function addDays(plainDate,days){
        const date=new Date(plainDate+"T00:00:00Z");

        date.setUTCDate(date.getUTCDate()+days);

        return date.toISOString().slice(0,10);
    }

    function daysUntil(plainDate){
        return Math.round(
            (Date.parse(plainDate+"T00:00:00Z")-Date.parse(today()+"T00:00:00Z"))
            /86400000
        );
    }

    function memberName(userId){
        const member=context.members.find(function(item){
            return item.user_id===userId;
        });

        return member ? member.full_name : t("common.formerMember");
    }

    // --- Database requests --------------------------------------------------

    function errorCode(error){
        if(!navigator.onLine){
            return "offline";
        }

        const message=String((error && error.message) || "");

        // Database functions raise short codes such as "not_pending".
        if(/^[a-z_]+$/.test(message) && i18next.exists("errors."+message)){
            return message;
        }

        if(/fetch|network/i.test(message)){
            return "network";
        }

        if(error && (error.code==="23514" || error.code==="42501")){
            return "validation";
        }

        return "server_error";
    }

    // Awaits a Supabase request, adds a timeout and turns a failure into an
    // AppError whose code has a translated message.
    async function request(builder){
        let timer;

        const timeout=new Promise(function(resolve,reject){
            timer=setTimeout(function(){
                reject(new AppError("timeout"));
            },REQUEST_TIMEOUT);
        });

        try{
            const result=await Promise.race([builder,timeout]);

            if(result.error){
                throw new AppError(errorCode(result.error));
            }

            return result.data;
        }catch(error){
            if(error instanceof AppError){
                throw error;
            }

            throw new AppError(errorCode(error));
        }finally{
            clearTimeout(timer);
        }
    }

    // --- Loading, empty and error states -------------------------------------

    function showLoading(){
        content.hidden=true;
        stateBox.replaceChildren(
            h("div",{class:"skeleton","aria-hidden":"true"}),
            h("div",{class:"skeleton short","aria-hidden":"true"}),
            h("p",{class:"sr-only",i18n:"states.loading"})
        );
    }

    const ERROR_LINKS={
        login_required:["../mateo/login.html","errors.loginLink"],
        missing_team:["../mateo/my-teams.html","errors.teamsLink"],
        no_access:["../mateo/my-teams.html","errors.teamsLink"],
        no_contract:["overview.html","errors.overviewLink"],
        not_found:["overview.html","errors.overviewLink"]
    };

    // Every error says what happened and offers a next step.
    function showError(code){
        const hintKey=i18next.exists("errors."+code+"_hint")
            ? "errors."+code+"_hint"
            : "errors.generic_hint";
        const link=ERROR_LINKS[code];
        let action;

        if(link){
            const target=link[0].startsWith("..") ? link[0] : url(link[0]);

            action=h("a",{class:"button button-secondary",href:target,i18n:link[1]});
        }else{
            action=h("button",{
                type:"button",
                class:"button button-secondary",
                i18n:"actions.retry",
                onclick:reload
            });
        }

        content.hidden=true;
        stateBox.replaceChildren(
            h("div",{class:"state state-error",role:"alert"},
                h("p",{class:"state-title",i18n:"errors."+code}),
                h("p",{i18n:hintKey}),
                action
            )
        );
    }

    function emptyState(titleKey,hintKey){
        return h("div",{class:"state"},
            h("p",{class:"state-title",i18n:titleKey}),
            hintKey ? h("p",{class:"muted",i18n:hintKey}) : null
        );
    }

    function toast(key,options){
        const region=document.querySelector("#toast");

        region.textContent=t(key,options);
        region.hidden=false;

        setTimeout(function(){
            region.hidden=true;
        },5000);
    }

    // Keeps a confirmation message for the page opened next.
    function toastOnNextPage(key){
        try{
            sessionStorage.setItem("contractToast",key);
        }catch(error){
            // Without storage the message is simply not shown.
        }
    }

    function showPendingToast(){
        try{
            const key=sessionStorage.getItem("contractToast");

            if(key){
                sessionStorage.removeItem("contractToast");
                toast(key);
            }
        }catch(error){
            // Nothing to show.
        }
    }

    // Confirmation for actions that delete data. The native dialog keeps
    // focus inside and closes with Escape; Cancel is focused first.
    function confirmAction(titleKey,bodyKey,bodyOptions,confirmKey){
        return new Promise(function(resolve){
            const cancel=h("button",{
                type:"button",
                class:"button button-secondary",
                i18n:"actions.cancel"
            });
            const confirm=h("button",{
                type:"button",
                class:"button button-danger",
                i18n:confirmKey
            });
            const dialog=h("dialog",{class:"dialog","aria-labelledby":"confirm-title"},
                h("h2",{id:"confirm-title",i18n:titleKey}),
                h("p",{i18n:[bodyKey,bodyOptions]}),
                h("div",{class:"dialog-actions"},cancel,confirm)
            );

            function close(answer){
                dialog.close();
                dialog.remove();
                resolve(answer);
            }

            cancel.addEventListener("click",function(){
                close(false);
            });
            confirm.addEventListener("click",function(){
                close(true);
            });
            dialog.addEventListener("cancel",function(event){
                event.preventDefault();
                close(false);
            });

            document.body.append(dialog);
            dialog.showModal();
            cancel.focus();
        });
    }

    // --- Public holidays (external REST API: Nager.Date) ----------------------
    // Only a country code and a year are sent. No personal data leaves the app.

    async function holidayYear(country,year){
        const cacheKey="holidays:"+country+":"+year;

        try{
            const cached=JSON.parse(sessionStorage.getItem(cacheKey) || "null");

            if(cached && Date.now()-cached.savedAt<HOLIDAY_CACHE_TIME){
                return cached.items;
            }
        }catch(error){
            // No usable cache; ask the service.
        }

        const controller=new AbortController();
        const timer=setTimeout(function(){
            controller.abort();
        },HOLIDAY_TIMEOUT);

        let response;

        try{
            response=await fetch(
                HOLIDAY_API+"/PublicHolidays/"+year+"/"+
                    encodeURIComponent(country),
                {signal:controller.signal}
            );
        }catch(error){
            throw new AppError(error.name==="AbortError" ? "timeout" : "network");
        }finally{
            clearTimeout(timer);
        }

        if(response.status===429){
            throw new AppError("rate_limited");
        }

        // Unknown country or no holidays: an empty result, not an error.
        if(response.status===204 || response.status===404){
            return [];
        }

        if(!response.ok){
            throw new AppError("unavailable");
        }

        let body;

        try{
            body=await response.json();
        }catch(error){
            throw new AppError("malformed");
        }

        if(!Array.isArray(body)){
            throw new AppError("malformed");
        }

        const items=body.filter(function(item){
            return item && isPlainDate(item.date);
        }).map(function(item){
            return {
                date:item.date,
                localName:String(item.localName || item.name || ""),
                name:String(item.name || item.localName || "")
            };
        });

        try{
            sessionStorage.setItem(cacheKey,JSON.stringify({
                savedAt:Date.now(),
                items:items
            }));
        }catch(error){
            // Caching is optional.
        }

        return items;
    }

    // Returns {status:"ok",items:[...]} or {status:"error",code:"timeout"}.
    async function holidaysBetween(country,from,to){
        const years=[Number(from.slice(0,4))];

        if(Number(to.slice(0,4))!==years[0]){
            years.push(Number(to.slice(0,4)));
        }

        try{
            const lists=await Promise.all(years.map(function(year){
                return holidayYear(country,year);
            }));

            return {
                status:"ok",
                items:lists.flat().filter(function(item){
                    return item.date>=from && item.date<=to;
                })
            };
        }catch(error){
            return {status:"error",code:error.code || "unavailable"};
        }
    }

    // --- Page frame -----------------------------------------------------------

    function buildFrame(){
        const file=window.location.pathname.split("/").pop() || "overview.html";
        const tabs=[
            ["overview.html","nav.overview",["overview.html","sections.html","status.html"]],
            ["changes.html","nav.changes",["changes.html","propose.html","voting.html"]],
            ["conflicts.html","nav.conflicts",["conflicts.html","report.html","conflict.html","resolution.html"]],
            ["history.html","nav.history",["history.html"]]
        ];

        const nav=h("nav",{class:"tabbar",ariaI18n:"nav.label"},
            tabs.map(function(tab){
                return h("a",{
                    class:"tab",
                    href:url(tab[0]),
                    "aria-current":tab[2].includes(file) ? "page" : null,
                    i18n:tab[1]
                });
            })
        );

        document.body.append(
            nav,
            h("div",{class:"toast-region",role:"status","aria-live":"polite"},
                h("p",{id:"toast",class:"toast",hidden:true})
            )
        );

        const back=document.querySelector("#back-link");

        if(back && back.dataset.back){
            back.href=url(back.dataset.back);
        }

        document.querySelectorAll("[data-link]").forEach(function(link){
            link.href=url(link.dataset.link);
        });

        const offline=document.querySelector("#offline-banner");

        function showConnection(){
            offline.hidden=navigator.onLine;
        }

        window.addEventListener("online",showConnection);
        window.addEventListener("offline",showConnection);
        showConnection();
    }

    async function loadContext(){
        if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(teamId || "")){
            throw new AppError("missing_team");
        }

        const {data:authData,error:authError}=await database.auth.getUser();

        if(authError || !authData || !authData.user){
            throw new AppError(navigator.onLine ? "login_required" : "offline");
        }

        context.user=authData.user;

        context.team=await request(
            database.from("teams")
                .select("id,name,project_name,owner_id")
                .eq("id",teamId)
                .maybeSingle()
        );

        if(!context.team){
            throw new AppError("no_access");
        }

        context.members=await request(
            database.rpc("get_team_members",{p_team_id:teamId})
        ) || [];

        context.contract=await request(
            database.from("contracts")
                .select("id,team_id,status,version,country_code,effective_from,created_at")
                .eq("team_id",teamId)
                .maybeSingle()
        );

        if(!context.contract && page.needsContract!==false){
            throw new AppError("no_contract");
        }
    }

    async function reload(){
        showLoading();

        try{
            await loadContext();
            pageData=await page.load(context);
            stateBox.replaceChildren();
            content.hidden=false;
            page.render(context,pageData);
        }catch(error){
            if(!(error instanceof AppError)){
                console.error(error);
            }

            pageData=null;
            showError(error.code || "server_error");
        }
    }

    // Each page calls ContractApp.start({load, render}).
    async function start(definition){
        page=definition;

        try{
            await startTranslations();
        }catch(error){
            console.error(error);
            document.querySelector("#language-message").hidden=false;
            return;
        }

        buildFrame();
        translatePage();
        showPendingToast();
        await reload();
    }

    window.ContractApp={
        AppError:AppError,
        addDays:addDays,
        badge:badge,
        confirmAction:confirmAction,
        daysUntil:daysUntil,
        emptyState:emptyState,
        fill:fill,
        formatDate:formatDate,
        formatDateTime:formatDateTime,
        formatPercent:formatPercent,
        formatRelative:formatRelative,
        h:h,
        holidaysBetween:holidaysBetween,
        language:language,
        memberName:memberName,
        params:params,
        reload:reload,
        request:request,
        start:start,
        t:t,
        toast:toast,
        toastOnNextPage:toastOnNextPage,
        today:today,
        url:url
    };
})();
