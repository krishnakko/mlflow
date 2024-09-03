import "./Loader.css";

export const TransparentLoader = () => {
    return (
        <div className="mainLoader">
            <div className="spinner"></div>
            {/* <CircularProgress className={classes.progress} /> */}
        </div>
    );
};

export const Loader = () => {

    return (
        <div className="main">
            <div className="spinner"></div>
            {/* <div className="message">{message}</div> */}
        </div>
    );
};