import { useNavigate } from "react-router-dom";
import { FaArrowLeft } from "react-icons/fa";

const BackButton = ({ className = "", variant = "absolute" }) => {
    const navigate = useNavigate();
    const positionClass = variant === "absolute" ? "absolute top-6 left-4 sm:left-8 z-50" : "relative mb-6";

    return (
        <div className={`${positionClass} ${className}`}>
            <button
                onClick={() => navigate(-1)}
                className="flex items-center gap-2 px-4 py-2 bg-midnight-900/80 backdrop-blur-md border border-white/10 rounded-xl text-xs font-black uppercase tracking-widest text-text-secondary hover:text-white hover:bg-midnight-800 hover:border-white/20 transition-all shadow-xl"
            >
                <FaArrowLeft /> Back
            </button>
        </div>
    );
};

export default BackButton;
