// Screen 10 – Contract Status: a summary of the contract and the public
// holidays in the next 30 days (external REST API: Nager.Date).
(function(){
    "use strict";

    const app=ContractApp;
    const h=app.h;
    const content=document.querySelector("#content");

    async function load(context){
        const contractId=context.contract.id;

        const sections=await app.request(
            database.from("contract_sections")
                .select("id,status")
                .eq("contract_id",contractId)
        );
        const requests=await app.request(
            database.from("change_requests")
                .select("id,status")
                .eq("contract_id",contractId)
        );
        const conflicts=await app.request(
            database.from("conflicts")
                .select("id,status")
                .eq("contract_id",contractId)
        );
        const lastEvent=await app.request(
            database.from("contract_history")
                .select("created_at")
                .eq("contract_id",contractId)
                .order("id",{ascending:false})
                .limit(1)
        );

        // A failed holiday request never blocks the rest of the page.
        const holidays=await app.holidaysBetween(
            context.contract.country_code,
            app.today(),
            app.addDays(app.today(),30)
        );

        return {
            sections:sections,
            requests:requests,
            conflicts:conflicts,
            lastActivity:lastEvent.length>0 ? lastEvent[0].created_at : null,
            holidays:holidays
        };
    }

    function countWhere(list,status){
        return list.filter(function(item){
            return item.status===status;
        }).length;
    }

    function stat(number,labelKey,options,link){
        const parts=[
            h("span",{class:"stat-number",text:number}),
            h("span",{class:"stat-label",i18n:[labelKey,options]})
        ];

        return h("li",null,link ? h("a",{href:link},parts) : parts);
    }

    function render(context,data){
        const agreed=countWhere(data.sections,"agreed");
        const pending=countWhere(data.requests,"pending");
        const resolved=countWhere(data.conflicts,"resolved");
        const open=data.conflicts.length-resolved;
        const healthy=pending===0 && open===0;
        const regionNames=new Intl.DisplayNames(app.language(),{type:"region"});
        const country=context.contract.country_code;

        let holidayBlock;

        if(data.holidays.status==="error"){
            const key="status.holidayError."+data.holidays.code;

            holidayBlock=h("div",{class:"banner banner-warn",role:"status"},
                h("p",{i18n:i18next.exists(key) ? key : "status.holidayError.unavailable"}),
                h("button",{type:"button",class:"button button-secondary",i18n:"actions.retry",onclick:app.reload})
            );
        }else if(data.holidays.items.length===0){
            holidayBlock=h("p",{i18n:"status.noHolidays"});
        }else{
            holidayBlock=h("ul",{class:"list compact"},data.holidays.items.map(function(item){
                return h("li",{class:"vote-row"},
                    h("span",null,
                        h("strong",{text:item.localName}),
                        item.name!==item.localName
                            ? h("span",{class:"muted small block",lang:"en",text:item.name})
                            : null
                    ),
                    h("span",{class:"muted"},
                        app.formatDate(item.date)," · ",
                        h("span",{i18n:["status.inDays",{count:app.daysUntil(item.date)}]})
                    )
                );
            }));
        }

        app.fill(content,
            h("section",{class:"card "+(healthy ? "card-ok" : "card-warn"),"aria-labelledby":"overall-heading"},
                h("div",{class:"row-between"},
                    h("h2",{id:"overall-heading",i18n:"status.overall"}),
                    app.badge(context.contract.status)
                ),
                h("p",{class:"lead",i18n:healthy ? "status.healthy" : "status.needsAttention"}),
                h("p",{class:"muted small"},
                    h("span",{i18n:["status.version",{version:context.contract.version}]}),
                    data.lastActivity ? " · " : null,
                    data.lastActivity ? h("span",{i18n:["status.lastActivity",{
                        when:app.formatRelative(data.lastActivity)
                    }]}) : null
                )
            ),

            h("section",{class:"card","aria-labelledby":"numbers-heading"},
                h("h2",{id:"numbers-heading",i18n:"status.numbers"}),
                h("ul",{class:"stats"},
                    stat(
                        app.formatPercent(data.sections.length ? agreed/data.sections.length : 0),
                        "status.agreedSections",
                        {count:agreed,total:data.sections.length}
                    ),
                    stat(pending,"status.pendingChanges",{count:pending},
                        app.url("changes.html",{status:"pending"})),
                    stat(open,"status.openConflicts",{count:open},
                        app.url("conflicts.html")),
                    stat(resolved,"status.resolvedConflicts",{count:resolved})
                )
            ),

            h("section",{class:"card","aria-labelledby":"holidays-heading"},
                h("h2",{id:"holidays-heading",i18n:"status.holidays"}),
                h("p",{class:"muted small",i18n:["status.holidaysWhy",{
                    country:regionNames.of(country) || country
                }]}),
                holidayBlock,
                h("p",{class:"muted small"},
                    h("span",{i18n:"status.source"})," ",
                    h("a",{href:"https://date.nager.at",rel:"noopener noreferrer",text:"Nager.Date"})
                )
            )
        );
    }

    app.start({load:load,render:render});
})();
