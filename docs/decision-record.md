# ADR-001 — Estrategia de aplicación

> Completa esta decisión en Semana 1. Una decisión no es solo una preferencia: relaciona restricciones, alternativas, consecuencias y una forma de validación.

## Estado

Estado: Aprobado — Semana 1 

## Contexto y restricciones

Se requiere construir un sistema para el registro y seguimiento de inspecciones en los 
laboratorios UTT. Las restricciones clave incluyen: conectividad a internet irregular o nula 
durante la operación en campo, necesidad de uso en dispositivos móviles variados, ventana 
acotada de desarrollo de 14 semanas, uso estricto de datos sintéticos y requisito de despliegue 
y verificación reproducible en CI. 

## Alternativas consideradas

| Criterio | PWA (Opción Seleccionada) | Web Tradicional | App Nativa (Android/iOS) | Multiplataforma (Flutter/RN) |
| :--- | :--- | :--- | :--- | :--- |
| **Soporte Offline** | Alto (Service Worker / Cache) | Nulo (Requiere red) | Alto (Almacenamiento nativo) | Alto (Base de datos local) |
| **Costo de Desarrollo** | Bajo (Código único Next.js) | Bajo | Alto (Múltiples plataformas) | Medio-Alto |
| **Distribución** | Inmediata vía URL / Instalable | Vía URL | Tiendas de aplicaciones (Play/App Store) | Tiendas de aplicaciones |
| **Mantenimiento** | Sencillo (Standard Web Stack) | Sencillo | Complejo | Medio |

## Decisión

Se selecciona la alternativa de **Aplicación Web Progresiva (PWA) basada en Next.js App Router, React y TypeScript**. Esta opción permite cumplir con la restricción técnica de operar bajo conectividad intermitente mediante tecnologías estándares (Service Workers, Cache Storage e IndexedDB en semanas posteriores) manteniendo un único código base ejecutable en navegador e instalable en dispositivos móviles sin la sobrecarga de publicación en tiendas.

## Consecuencias y riesgos

* **Consecuencias positivas:** Despliegue inmediato, alta reproducibilidad con Node.js y Docker, bajo costo operativo y cumplimiento directo con el plan de estudios.
* **Riesgos técnicos:** Manejo de políticas de caché complejas e incompatibilidades menores entre navegadores móviles (iOS Safari vs. Android Chrome).
* **Mitigación:** Uso de fallbacks seguros, estrategias declarativas de almacenamiento local y pruebas continuas con GitHub Actions.

## Validación

La decisión se validará mediante la ejecución exitosa de pruebas públicas (`make verify`), simulación de cortes de red en DevTools y la ejecución de la suite de CI en GitHub Actions en cada entrega semanal.
