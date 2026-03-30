import json
import pandas as pd
from typing import Dict, List, Optional
from datetime import datetime
import os

class ZBBManager:
    """
    Gestor de Presupuesto Base Cero (Zero-Based Budgeting) para análisis profundo (Sistema 2).
    Esta clase lee la estructura de presupuesto JSON exportada por la aplicación móvil (Frontend)
    y permite cruzar los datos o transformarlos en DataFrames de Pandas para auditoría cuantitativa.
    """
    
    def __init__(self, month_id: str, total_income: float, allocations: List[Dict] = None):
        self.month_id = month_id
        self.total_income = total_income
        # Allocations es una lista de diccionarios: [{'category_name': '...', 'amount': ..., 'category_type': 'needs'|'wants'|'savings'}]
        self.allocations = allocations if allocations is not None else []
        
    @classmethod
    def load_from_json(cls, file_path: str) -> 'ZBBManager':
        """
        Instancia un ZBBManager a partir del archivo JSON exportado por la app de Finanzas Personales.
        """
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"No se encontró el archivo de planificación: {file_path}")
            
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
            
        return cls(
            month_id=data.get('month_id', datetime.now().strftime('%Y-%m')),
            total_income=data.get('total_income', 0.0),
            allocations=data.get('allocations', [])
        )
        
    def get_heuristic_guide(self) -> Dict[str, float]:
        """
        Calcula la "Guía Fantasma" ideal basada en la regla 50/30/20 del ingreso total.
        """
        return {
            "needs_50": round(self.total_income * 0.50, 2),
            "wants_30": round(self.total_income * 0.30, 2),
            "savings_20": round(self.total_income * 0.20, 2)
        }

    def calculate_current_state(self) -> Dict[str, float]:
        """
        Calcula métricas actuales basadas en las asignaciones guardadas.
        """
        total_allocated = sum(item['amount'] for item in self.allocations)
        delta = round(self.total_income - total_allocated, 2)
        
        status = 'Maestría ZBB'
        if delta > 0:
            status = 'Capital Ocioso'
        elif delta < 0:
            status = 'Sobreasignación'
            
        return {
            "total_income": self.total_income,
            "total_allocated": total_allocated,
            "delta": delta,
            "status": status
        }
        
    def get_distribution_summary(self) -> pd.DataFrame:
        """
        Agrupa y resume la distribución actual del presupuesto contra la guía ideal.
        Retorna un DataFrame estructurado.
        """
        if not self.allocations:
            return pd.DataFrame()
            
        df = pd.DataFrame(self.allocations)
        grouped = df.groupby('category_type')['amount'].sum().reset_index()
        
        # Calcular porcentaje sobre el total
        grouped['percentage_of_income'] = (grouped['amount'] / self.total_income) * 100
        
        # Mapeo ideal
        ideal_mapping = {
            'needs': 50.0,
            'wants': 30.0,
            'savings': 20.0
        }
        
        grouped['ideal_percentage'] = grouped['category_type'].map(ideal_mapping)
        grouped['deviation_vs_ideal_percent'] = grouped['percentage_of_income'] - grouped['ideal_percentage']
        
        return grouped

    def export_to_dataframe(self) -> pd.DataFrame:
        """
        Convierte la lista de asignaciones directamente a un DataFrame de Pandas
        listo para ser cruzado con los gastos reales del mes.
        """
        if not self.allocations:
            print("No hay asignaciones cargadas.")
            return pd.DataFrame()
            
        df = pd.DataFrame(self.allocations)
        df['month_id'] = self.month_id
        return df

# Ejemplo de uso:
if __name__ == "__main__":
    import numpy as np
    
    # Simulación de un JSON que recibiría de la app
    dummy_data = {
        "month_id": "2026-03",
        "total_income": 5000.0,
        "allocations": [
            {"category_name": "Vivienda", "amount": 1500.0, "category_type": "needs"},
            {"category_name": "Alimentación", "amount": 800.0, "category_type": "needs"},
            {"category_name": "Salidas", "amount": 500.0, "category_type": "wants"},
            {"category_name": "Suscripciones", "amount": 100.0, "category_type": "wants"},
            {"category_name": "Inversión SP500", "amount": 1000.0, "category_type": "savings"},
            {"category_name": "Fondo Emergencia", "amount": 1100.0, "category_type": "savings"}
        ]
    }
    
    # Crear archivo de prueba
    test_file = 'temp_zbb_plan.json'
    with open(test_file, 'w') as f:
        json.dump(dummy_data, f)
        
    # Inicializar manager
    manager = ZBBManager.load_from_json(test_file)
    
    print("--- 1. Guía Fantasma (50/30/20) ---")
    print(manager.get_heuristic_guide())
    
    print("\n--- 2. Estado Actual (Delta) ---")
    print(manager.calculate_current_state())
    
    print("\n--- 3. Resumen de Distribución Real vs Ideal ---")
    print(manager.get_distribution_summary())
    
    print("\n--- 4. DataFrame Completo ---")
    df_plan = manager.export_to_dataframe()
    print(df_plan)
    
    # Limpiar prueba
    os.remove(test_file)
