import { supabase } from "../supabaseConfig";

async function checkPermission(permission:string){
    const {data:user} = await supabase.auth.getUser();
    const user_email = user.user?.email || '';
    if(user){
        const { data, error } = await supabase.from('roles').select('user_permissions').eq('user_email', user_email);
        if(data && data.length > 0){
            const user_permissions = data[0].user_permissions;
            if(user_permissions.includes(permission)){
                return true;
            }
        }

    }
    return false;
}

export default checkPermission;