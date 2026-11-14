// Loads one conflict with everything attached to it.
// Used by conflict.html (screen 07) and resolution.html (screen 08).
(function(){
    "use strict";

    const app=ContractApp;

    ContractApp.loadConflict=async function(conflictId){
        const conflict=await app.request(
            database.from("conflicts")
                .select("id,contract_id,reporter_id,section_id,title,description,severity,status,created_at")
                .eq("id",conflictId || "00000000-0000-0000-0000-000000000000")
                .maybeSingle()
        );

        if(!conflict){
            throw new app.AppError("not_found");
        }

        let section=null;

        if(conflict.section_id){
            section=await app.request(
                database.from("contract_sections")
                    .select("id,kind")
                    .eq("id",conflict.section_id)
                    .maybeSingle()
            );
        }

        const participants=await app.request(
            database.from("conflict_participants")
                .select("user_id")
                .eq("conflict_id",conflict.id)
        );

        const updates=await app.request(
            database.from("conflict_updates")
                .select("id,author_id,body,created_at")
                .eq("conflict_id",conflict.id)
                .order("created_at",{ascending:true})
        );

        const resolutions=await app.request(
            database.from("resolutions")
                .select("id,proposer_id,proposal,status,created_at")
                .eq("conflict_id",conflict.id)
                .order("created_at",{ascending:false})
        );

        let responses=[];

        if(resolutions.length>0){
            responses=await app.request(
                database.from("resolution_responses")
                    .select("resolution_id,user_id,response,comment")
                    .in("resolution_id",resolutions.map(function(item){
                        return item.id;
                    }))
            );
        }

        return {
            conflict:conflict,
            section:section,
            participants:participants.map(function(item){
                return item.user_id;
            }),
            updates:updates,
            resolutions:resolutions,
            responses:responses,
            open:resolutions.find(function(item){
                return item.status==="proposed";
            }) || null
        };
    };
})();
