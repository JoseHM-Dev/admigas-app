export const Titulo = ({Texto}) => {
    return(
        <section className="font-extrabold flex justify-center text-3xl text-transparent bg-clip-text bg-linear-to-r from-[#5180f6] via-[#6d72f9] to-[#9777e9] dark:from-sky-400 dark:via-indigo-400 dark:to-purple-400 my-8 hover:scale-105 transition-all duration-200 animate-pulse">
            <h2 >{Texto}</h2>
        </section>
    )
}