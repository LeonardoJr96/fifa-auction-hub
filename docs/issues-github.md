# Issues para GitHub

## 1) Migrate JWT storage from localStorage to secure HttpOnly cookies
**Tipo**: Security / Auth  
**Descrição**: Tokens JWT são salvos em `localStorage` e podem ser extraídos por XSS. O fluxo recomendado é usar cookies HttpOnly, `SameSite=Lax` ou `Strict`, e refresh token com política de rotação.

## 2) Require explicit SECRET_KEY in production
**Tipo**: Security / Configuration  
**Descrição**: O projeto usa um valor padrão público quando `SECRET_KEY` não é configurada. Em produção, a aplicação deve falhar ao iniciar se o segredo não estiver definido.

## 3) Reduce and redact personal-data access logs
**Tipo**: Privacy / Compliance  
**Descrição**: O sistema grava IP e eventos de acesso a dados pessoais. Definir política de retenção, mascaramento e acesso restrito a esses registros é necessário.

## 4) Add media validation for uploads
**Tipo**: Security / File handling  
**Descrição**: Qualquer uso de `ImageField` deve ser complementado com validação de tamanho, tipo e conteúdo. Isso reduz risco de abuso em uploads de arquivos maliciosos.
