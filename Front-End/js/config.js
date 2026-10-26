window.IOH_API = window.IOH_API || (
    location.port === "3000"
        ? ""
        : "http://" + (location.hostname || "localhost") + ":3000"
);