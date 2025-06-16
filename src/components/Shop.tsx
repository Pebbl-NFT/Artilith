import React, { useState } from "react";
import { ItemCard } from "@/components/ItemCard";

type Item = {
  item_id: string;
  type: string;
  rarity: string;
  name: string;
  image: string;
  description: string;
  damage?: number;
  defense?: number;
  price: number;
};

type ShopProps = {
  WeaponItems: Item[];
  ShieldItems: Item[];
  ScrollItems: Item[];
  setSelectedItem: (item: Item) => void;
};

const Shop: React.FC<ShopProps> = ({ WeaponItems, ShieldItems, ScrollItems, setSelectedItem }) => {
  const [activeTab, setActiveTab] = useState("weapons"); // Відстежує поточну вкладку

  const renderTabContent = () => {
    if (activeTab === "weapons") {
      return WeaponItems.length > 0 ? (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "15px",
            justifyContent: "center",
          }}
        >
          {WeaponItems.map((item) => (
            <ItemCard
              mode={"city"}
              key={item.item_id}
              item_id={Number(item.item_id)}
              type={item.type}
              rarity={item.rarity}
              name={item.name}
              image={item.image}
              description={item.description}
              damage={item.damage ? `${item.damage}` : "0"}
              defense={item.defense ? `${item.defense}` : "0"}
              price={item.price}
              onBuyRequest={() => setSelectedItem(item)}
            />
          ))}
        </div>
      ) : (
        <p style={{ textAlign: "center", color: "#888" }}>Тут порожньо...</p>
      );
    } else if (activeTab === "armor") {
      return ShieldItems.length > 0 ? (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "15px",
            justifyContent: "center",
          }}
        >
          {ShieldItems.map((item) => (
            <ItemCard
              mode={"city"}
              key={item.item_id}
              item_id={Number(item.item_id)}
              type={item.type}
              rarity={item.rarity}
              name={item.name}
              image={item.image}
              description={item.description}
              damage={item.damage ? `${item.damage}` : "0"}
              defense={item.defense ? `${item.defense}` : "0"}
              price={item.price}
              onBuyRequest={() => setSelectedItem(item)}
            />
          ))}
        </div>
      ) : (
        <p style={{ textAlign: "center", color: "#888" }}>Немає предметів...</p>
      );
    } else if (activeTab === "scrolls") {
      return ScrollItems.length > 0 ? (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "15px",
            justifyContent: "center",
          }}
        >
          {ScrollItems.map((item) => (
            <ItemCard
              mode={"city"}
              key={item.item_id}
              item_id={Number(item.item_id)}
              type={item.type}
              rarity={item.rarity}
              name={item.name}
              image={item.image}
              description={item.description}
              damage={item.damage ? `${item.damage}` : "0"}
              defense={item.defense ? `${item.defense}` : "0"}
              price={item.price}
              onBuyRequest={() => setSelectedItem(item)}
            />
          ))}
        </div>
      ) : (
        <p style={{ textAlign: "center", color: "#888" }}>Список пустий...</p>
      );
    }
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "flex-start",
        width: "100%",
        backgroundColor: "#121015", // Темний фон для магазину
        color: "#e0dcca", // Світлий текст
        minHeight: "100vh",
        padding: "20px",
      }}
    >
      {/* Заголовок */}
      <h1
        style={{
          fontSize: "1.8rem",
          fontWeight: "lighter",
          color: "#E0B870",
          textShadow: "1px 1px 4px black",
          textAlign: "center",
          paddingBottom: "15px",
          marginTop: "70px",
        }}
      >
        Магазин
      </h1>

      {/* Вкладки для категорій */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: "20px",
          marginBottom: "20px",
        }}
      >
        <button
          style={{
            padding: "10px 20px",
            backgroundColor: activeTab === "weapons" ? "#c0392b" : "#2a2a2a",
            color: "#fff",
            border: "none",
            borderRadius: "5px",
            cursor: "pointer",
            fontWeight: activeTab === "weapons" ? "bold" : "normal",
          }}
          onClick={() => setActiveTab("weapons")}
        >
          Зброя
        </button>
        <button
          style={{
            padding: "10px 20px",
            backgroundColor: activeTab === "armor" ? "#4a708b" : "#2a2a2a",
            color: "#fff",
            border: "none",
            borderRadius: "5px",
            cursor: "pointer",
            fontWeight: activeTab === "armor" ? "bold" : "normal",
          }}
          onClick={() => setActiveTab("armor")}
        >
          Броня
        </button>
        <button
          style={{
            padding: "10px 20px",
            backgroundColor: activeTab === "scrolls" ? "#7E5A9B" : "#2a2a2a",
            color: "#fff",
            border: "none",
            borderRadius: "5px",
            cursor: "pointer",
            fontWeight: activeTab === "scrolls" ? "bold" : "normal",
          }}
          onClick={() => setActiveTab("scrolls")}
        >
          Сувої
        </button>
      </div>

      {/* Вміст активної вкладки */}
      <div
        style={{
          width: "100%",
          maxWidth: "900px",
          display: "flex",
          flexDirection: "column",
          gap: "15px",
        }}
      >
        {renderTabContent()}
      </div>
    </div>
  );
};

export default Shop;