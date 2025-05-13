"use client";
import React from "react";

type ItemCardProps = {
  mode: "city" | "inventory" | "equipped";
  item_id: number;
  type: string;
  rarity: string;
  name: string;
  image: string;
  description: string;
  damage?: string;
  strength?: string;
  price: number;
  onBuyRequest?: (item: ItemCardProps) => void;
  onClickDetails?: (item: ItemCardProps) => void;
};

export const ItemCard: React.FC<ItemCardProps> = ({
  mode,
  item_id,
  type,
  rarity,
  name,
  image,
  description,
  damage,
  strength,
  price,
  onBuyRequest,
  onClickDetails,
}) => {
  
  const handleClick = () => {
    if (mode !== "inventory" && onClickDetails) {
      onClickDetails({
        mode,
        item_id,
        type,
        rarity,
        name,
        image,
        description,
        damage,
        strength,
        price,
        onBuyRequest,
        onClickDetails,
      });
    }
  };

  return (
    <div
      onClick={mode !== "city" ? handleClick : undefined}
      style={{
        borderRadius: "10px",
        padding: "20px",
        textAlign: "center",
        boxShadow: "0 2px 9px rgba(0, 0, 0, 0.3)",
        border: "1px solid rgba(255, 255, 255, 0.1)",
        cursor: mode !== "city" ? "pointer" : "default",
      }}
    >
      <img
        src={image}
        alt={name}
        width={50}
        height={50}
        className={`item-image rarity-border-${rarity?.toLowerCase()}`}
        style={{
          backgroundColor: "rgba(255, 255, 255, 0.05)",
          padding: "20px",
          borderRadius: "10px",
          marginBottom: "15px",
          boxShadow:
            "rgba(0, 0, 0, 0.3) 0px 19px 38px, rgba(0, 0, 0, 0.22) 0px 15px 12px",
        }}
      />
      <h3 style={{ color: "rgba(253, 253, 253, 0.37)", marginBottom: "10px" }}>
        {name}
      </h3>
      <p style={{ color: "#ddd", marginBottom: "15px" }}>{description}</p>
      {damage && <p style={{ color: "#ddd", marginBottom: "5px" }}>{damage}</p>}
      {strength && (
        <p style={{ color: "#ddd", marginBottom: "15px" }}>{strength}</p>
      )}
      {mode === "city" && (
        <button
          style={{
            backgroundColor: "#00bcd4",
            border: "none",
            padding: "12px 24px",
            fontSize: "1rem",
            color: "#fff",
            borderRadius: "6px",
            cursor: "pointer",
            transition: "all 0.3s ease",
            marginTop: "10px",
          }}
          onClick={(e) => {
            e.stopPropagation(); // Щоб не триггерив `onClickDetails`
            onBuyRequest?.({
              mode,
              item_id,
              type,
              rarity,
              name,
              image,
              description,
              damage,
              strength,
              price,
              onBuyRequest,
              onClickDetails,
            });
          }}
        >
          Купити за {price} 🪨
        </button>
      )}
    </div>
  );
};
