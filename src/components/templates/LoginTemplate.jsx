import {NavBarLogin} from "../LoginComponents/1NavBarLogin"
import {MainLogin} from "../LoginComponents/2MainLogin"
import {Footer} from "../ui/Footer";


export const LoginTemplate = () =>{

return (
    <main >
            
        <NavBarLogin/>
        <MainLogin/>
        <Footer/>
                
    </main>
  );
};
