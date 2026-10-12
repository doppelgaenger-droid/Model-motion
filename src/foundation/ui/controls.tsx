import type { ButtonHTMLAttributes, SelectHTMLAttributes } from "react";
import "./controls.css";

type ButtonVariant = "primary" | "secondary" | "ghost";
export function UIButton({ variant = "secondary", className = "", type = "button", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  return <button type={type} className={`mm-button mm-button--${variant} ${className}`.trim()} {...props}/>;
}
export function UISelect({ className = "", ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={`mm-select ${className}`.trim()} {...props}/>;
}
