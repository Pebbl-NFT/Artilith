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
  defense?: string;
  price: number;
  onBuyRequest?: (item: ItemCardProps) => void;
  onEquipRequest?: (item: ItemCardProps) => void;
  onUnequipRequest?: (item: ItemCardProps) => void;
  onDismantleRequest?: (item: ItemCardProps) => void;
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
  defense,
  price,
  onBuyRequest,
  onEquipRequest,
  onUnequipRequest,
  onDismantleRequest,
}) => {
  const commonInfo = (
    <>
      <img
        src={image}
        alt={name}
        width={50}
        height={50}
        className={`item-image rarity-border-${rarity?.toLowerCase?.()}`}
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
      {defense && (
        <p style={{ color: "#ddd", marginBottom: "15px" }}>{defense}</p>
      )}
    </>
  );

  return (
    <div
      style={{
        borderRadius: "10px",
        padding: "20px",
        textAlign: "center",
        boxShadow: "0 2px 9px rgba(0, 0, 0, 0.3)",
        border: "1px solid rgba(255, 255, 255, 0.1)",
        backgroundColor: "rgba(255,255,255,0.02)",
      }}
    >
      {commonInfo}

      {/* City: Покупка */}
      {mode === "city" && (
        <button
          style={buttonStyle()}
          onClick={() =>
            onBuyRequest?.({
              mode,
              item_id,
              type,
              rarity,
              name,
              image,
              description,
              damage,
              defense,
              price,
              onBuyRequest,
            })
          }
        >
          Купити за {price} 🪨
        </button>
      )}

      {/* Inventory: Спорядити + Розібрати */}
      {mode === "inventory" && (
        <>
          <button
            style={buttonStyle()}
            onClick={() =>
              onEquipRequest?.({
                mode,
                item_id,
                type,
                rarity,
                name,
                image,
                description,
                damage,
                defense,
                price,
              })
            }
          >
            ⚔️ Спорядити
          </button>
          <button
            style={{ ...buttonStyle(), backgroundColor: "#c62828" }}
            onClick={() =>
              onDismantleRequest?.({
                mode,
                item_id,
                type,
                rarity,
                name,
                image,
                description,
                damage,
                defense,
                price,
              })
            }
          >
            🧨 Розібрати
          </button>
        </>
      )}

      {/* Equipped: Зняти */}
      {mode === "equipped" && (
        <button
          style={buttonStyle()}
          onClick={() =>
            onUnequipRequest?.({
              mode,
              item_id,
              type,
              rarity,
              name,
              image,
              description,
              damage,
              defense,
              price,
            })
          }
        >
          🛡️ Зняти
        </button>
      )}
    </div>
  );
};

const buttonStyle = () => ({
  backgroundColor: "#00bcd4",
  border: "none",
  padding: "12px 24px",
  fontSize: "1rem",
  color: "#fff",
  borderRadius: "6px",
  cursor: "pointer",
  transition: "all 0.3s ease",
  marginTop: "10px",
});
