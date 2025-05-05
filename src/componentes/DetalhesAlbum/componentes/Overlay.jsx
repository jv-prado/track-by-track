import React from "react";

const Overlay = ({ mostrar, onClick, className = "" }) => {
  if (!mostrar) return null;
  return (
    <div
      className={`fixed inset-0 bg-black/60 z-40 ${className}`}
      onClick={onClick}
    />
  );
};

export default Overlay;
