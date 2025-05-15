import React from "react";

interface EquippedItemSlotProps {
  item?: any; // можеш замінити на точний тип
  fallbackIcon: string;
  onClick?: () => void;
  size?: number;
  
}

const EquippedItemSlot: React.FC<EquippedItemSlotProps> = ({ item, fallbackIcon, onClick, size = 50 }) => {
  const imageSrc =
    item?.image && typeof item.image === "string"
      ? item.image
      : item?.image?.src;

  return (
    <div
      onClick={onClick}
      style={{
        padding: "10px",
        borderRadius: "10px",
        maxWidth: "100%",
        height: "auto",
        cursor: onClick ? "pointer" : "default"
      }}
    >
      {item ? (
        <img
          src={imageSrc}
          alt={item.name || "item"}
          className={`item-image rarity-border-${item.rarity?.toLowerCase()}`}
          style={{
            width: size,
            backgroundColor: "rgba(255, 255, 255, 0.05)",
            padding: "10px",
            borderRadius: "10px",
            boxShadow: "rgba(0, 0, 0, 0.3) 0px 19px 38px, rgba(0, 0, 0, 0.22) 0px 15px 12px",
            maxWidth: "100%",
            height: "auto"
          }}
        />
      ) : (
        <span style={{ fontSize: size }}>{fallbackIcon}</span>
      )}
    </div>
  );
};

export default EquippedItemSlot;
