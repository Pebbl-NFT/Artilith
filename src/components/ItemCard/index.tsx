"use client";
import React from "react";

type ItemCardProps = {
  mode: "city" | "inventory" | "equipped"| "sweapon"| "sshield" |"sscroll";
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
    <div>
    </div>
  );

  return (
    <div>
      {commonInfo}

      {/* City: Покупка */}
      {mode === "city" && (
        <div>
          <div>
              <img onClick={() =>
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
                src={image}
                alt={name}
                width={30}
                height={30}
                className={`item-image rarity-border-${rarity?.toLowerCase?.()}`}
                style={{
                  backgroundColor: "rgba(255, 255, 255, 0.05)",
                  padding: "10px",
                  borderRadius: "10px",
                  boxShadow:
                    "rgba(0, 0, 0, 0.3) 0px 19px 38px, rgba(0, 0, 0, 0.22) 0px 15px 12px",
                }}
              />
          </div>
        </div>
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

      {mode === "sweapon" && (
        <div>
          <div>
              <img onClick={() =>
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
                src={image}
                alt={name}
                width={30}
                height={30}
                className={`item-image rarity-border-${rarity?.toLowerCase?.()}`}
                style={{
                  backgroundColor: "rgba(255, 255, 255, 0.05)",
                  padding: "10px",
                  borderRadius: "10px",
                  boxShadow:
                    "rgba(0, 0, 0, 0.3) 0px 19px 38px, rgba(0, 0, 0, 0.22) 0px 15px 12px",
                }}
              />
          </div>
        </div>
      )}

      {mode === "sshield" && (
        <div>
          <div>
              <img onClick={() =>
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
                src={image}
                alt={name}
                width={30}
                height={30}
                className={`item-image rarity-border-${rarity?.toLowerCase?.()}`}
                style={{
                  backgroundColor: "rgba(255, 255, 255, 0.05)",
                  padding: "10px",
                  borderRadius: "10px",
                  boxShadow:
                    "rgba(0, 0, 0, 0.3) 0px 19px 38px, rgba(0, 0, 0, 0.22) 0px 15px 12px",
                }}
              />
          </div>
        </div>
      )}
      {mode === "sscroll" && (
        <div>
          <div>
              <img onClick={() =>
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
                src={image}
                alt={name}
                width={30}
                height={30}
                className={`item-image rarity-border-${rarity?.toLowerCase?.()}`}
                style={{
                  backgroundColor: "rgba(255, 255, 255, 0.05)",
                  padding: "10px",
                  borderRadius: "10px",
                  boxShadow:
                    "rgba(0, 0, 0, 0.3) 0px 19px 38px, rgba(0, 0, 0, 0.22) 0px 15px 12px",
                }}
              />
          </div>
        </div>
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
