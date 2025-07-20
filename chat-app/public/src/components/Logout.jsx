import React from "react";
import { useNavigate } from "react-router-dom";
import styled from "styled-components";
import { BiPowerOff } from "react-icons/bi";
import authService from "../services/authService";

// Logout
const Logout = () => {
  const navigate = useNavigate();
  const handleClick = async () => {
    await authService.logout(); // Utiliser le service d'authentification
    navigate("/login"); // redirect to login
  };

  return (
    <Button onClick={handleClick} title="Logout">
      <BiPowerOff />
    </Button>
  );
};

// Styled Components
const Button = styled.button`
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 0.5rem;
  border-radius: 0.5rem;
  background-color: #9a86f3;
  border: none;
  cursor: pointer;

  svg {
    font-size: 1.3rem;
    color: #ebe7ff;
  }
`;

export default Logout;
