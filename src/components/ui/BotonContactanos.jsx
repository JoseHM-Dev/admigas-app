export const BotonContactanos = ({text}) =>{
    return(
        <button className="bg-transparent text-black">
            <span className="hover:bg-linear-to-r from-pink-600 to-purple-600 hover:text-transparent hover:bg-clip-text hover:cursor-pointer">
                {text}
            </span>
        </button>
    )
}