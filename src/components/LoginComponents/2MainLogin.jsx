import { useState } from "react";
import { supabase } from "../../supabaseClient"; // Importamos supabase
import CustomCheckbox from "../ui/CheckBox";
import { BtnIniciarSesion } from "../ui/BotonIniciarSesion";
import { BotonContactanos } from "../ui/BotonContactanos";
import imgIlustrativaLogin from "../../assets/img/img-ilustrativa-login.png";
import imgTechnoLogo from "../../assets/img/icono technoart negro.png";
import { Link } from "react-router-dom"; // Importamos Link


export const MainLogin = () => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const handleSubmit = async (e) => {
        e.preventDefault(); // Evita que la página se recargue
        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email: email,
                password: password,
            });

            if (error) {
                console.error("Error al iniciar sesión:", error.message);
                alert(`Error: ${error.message}`);
                return;
            }

            console.log("Inicio de sesión exitoso:", data);
            alert("¡Has iniciado sesión con éxito!");
            // Aquí podrías redirigir al usuario al dashboard
            // por ejemplo: window.location.href = '/dashboard';

        } catch (error) {
            console.error("Error inesperado:", error.message);
            alert(`Error inesperado: ${error.message}`);
        }
    };

    return (
        <main className=" w-screen flex justify-center mt-15">
            <section className="flex flex-col bg-black/20 m-6 p-6 items-center w-min-[520px] lg:flex-row">
                <section className=" flex justify-center items-center lg:w-[500px]">
                    <img
                        className="flex w-[380px] animate-[float_3s_ease-in-out_infinite] "
                        src={imgIlustrativaLogin}
                        alt="imagen gas"
                    />
                </section>

                <section className="lg:flex lg:flex-col">
                    <section className="flex flex-col items-center justify-center  ">
                        <img
                            className="w-[150px] hidden lg:flex opacity-40"
                            src={imgTechnoLogo}
                            alt="Logo Tecnoart"
                        />
                        <span className="font-sans text-black/60 text-2xl font-bold">
                            🔥 Bienvenido 🔥
                        </span>
                    </section>
                    <form className="flex flex-col gap-5 m-5" onSubmit={handleSubmit}>
                        <input
                            className="bg-white rounded-lg w-[320px] h-[35px] p-2 shadow-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 focus:outline-none "
                            type="email"
                            placeholder="Usuario"
                            id="email"
                            name="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />

                        <input
                            className="bg-white rounded-lg w-[320px] h-[35px] p-2 shadow-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 focus:outline-none"
                            type="password"
                            placeholder="Contraseña"
                            id="password"
                            name="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                        <section className="flex  justify-start mx-4.5">
                            <CustomCheckbox label="Recordarme" />
                        </section>
                        <section className="flex flex-col items-center justify-center">
                            <div className="m-5">
                                <BtnIniciarSesion text="Iniciar Sesión" type="submit" />
                            </div>

                            <div className="mb-5 mt-5 max-w-9">
                                <Link to="/Home">
                                    <BotonContactanos text="Inicio" />
                                </Link>
                                
                            </div>
                        </section>
                    </form>
                </section>
            </section>
        </main>
    );
};

