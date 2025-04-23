# Documentação do Sistema OdontoLegal

## Visão Geral

O **OdontoLegal** é uma plataforma especializada em perícia odontológica, desenvolvida para apoiar profissionais na gestão de casos, evidências, laudos e registros odontológicos.

### Estrutura do Sistema

- **Backend**: API REST em Node.js/Express com MongoDB
- **Frontend**: Aplicação React com Vite, Tailwind CSS e diversas bibliotecas modernas

---

## Modelos de Dados

### User

- Gerencia usuários com diferentes níveis de acesso (admin, perito, assistente)
- Implementa autenticação segura com JWT
- Armazena senhas com hash via bcrypt
- Inclui funções para verificação de senha e alterações de credenciais

### Case

- Representa casos periciais odontológicos
- Campos: título, descrição, tipo, status
- Referências para usuário responsável e criador
- Histórico de alterações detalhado
- População virtual de evidências e laudos relacionados

### Evidence

- Gerencia evidências de casos
- Tipos: imagem, documento, relato
- Metadados e informações de upload
- Histórico de ações realizadas

### Report

- Implementa laudos periciais com templates variados
- Estrutura: introdução, metodologia, análise, conclusão
- Versionamento completo de alterações
- Exportação para PDF com formatação profissional

### DentalRecord

- Registros odontológicos detalhados
- Armazena características dentais
- Suporta comparação entre registros para identificação

---

## Endpoints da API

### Autenticação

- `POST /auth/login`: Login de usuário  
- `POST /auth/register`: Registro de novo usuário  
- `POST /auth/forgot-password`: Recuperação de senha  
- `PATCH /auth/reset-password/:token`: Reset de senha com token  
- `PATCH /auth/update-password`: Atualização de senha

### Casos

- `GET /cases`: Lista todos os casos (com filtros)  
- `POST /cases`: Cria novo caso  
- `GET /cases/:id`: Detalhes de um caso específico  
- `PUT /cases/:id`: Atualiza caso  
- `PATCH /cases/:id/status`: Atualiza status  
- `DELETE /cases/:id`: Remove caso  
- `GET /cases/search`: Busca avançada

### Evidências

- `GET /evidences`: Lista todas as evidências  
- `POST /evidences`: Upload de nova evidência  
- `GET /evidences/:id`: Detalhes da evidência  
- `PUT /evidences/:id`: Atualiza evidência  
- `DELETE /evidences/:id`: Remove evidência  
- `GET /cases/:caseId/evidences`: Lista evidências do caso

### Laudos

- `GET /reports`: Lista todos os laudos  
- `POST /reports`: Cria novo laudo  
- `GET /reports/:id`: Detalhes do laudo  
- `PUT /reports/:id`: Atualiza laudo  
- `POST /reports/:id/finalize`: Finaliza laudo  
- `GET /reports/:id/export`: Exporta para PDF

### Registros Odontológicos

- `GET /dental-records`: Lista todos os registros  
- `POST /dental-records`: Cria novo registro  
- `GET /dental-records/:id`: Detalhes do registro  
- `PUT /dental-records/:id`: Atualiza registro  
- `POST /dental-records/compare`: Compara dois registros  
- `GET /dental-records/search`: Busca por características

---

## Frontend

### Sistema de Autenticação

- Gerenciamento de tokens JWT via Context API  
- Interceptores para renovação automática de token  
- Proteção de rotas com controle de permissões  

### Gerenciamento de Estado

- **React Query**: Comunicação com API e cache  
- **Context API**: Estado global (autenticação)  
- **Formik & Yup**: Formulários e validação  

### UI/UX

- Interface responsiva com Tailwind CSS  
- Componentes modais e dropdowns via HeadlessUI  
- Toasts de notificação com React Toastify  
- Ícones via Phosphor Icons  

---

## Dependências Principais

### Backend

- `Express`: Framework web  
- `Mongoose`: ODM MongoDB  
- `JWT`: Autenticação  
- `Bcrypt`: Hashing de senhas  
- `Multer`: Upload de arquivos  
- `Winston`: Logging  
- `PDFKit`: Geração de PDFs  

### Frontend

- `React 18`  
- `React Router DOM 7`  
- `Axios`: Cliente HTTP  
- `React Query`: Gerenciamento de estado e cache  
- `Formik & Yup`: Formulários e validação  
- `Tailwind CSS`: Estilização  
- `HeadlessUI`: Componentes UI acessíveis  
- `React Toastify`: Notificações  
- `React Dropzone`: Upload de arquivos  

---

## Estado Atual e Próximos Passos

### Implementado

- Estrutura completa do backend  
- Modelos de dados principais  
- Sistema de autenticação  
- Gerenciamento básico de casos  
- Upload de evidências  
- Geração de laudos  

### Em Desenvolvimento

- Integração frontend-backend  
- Sistema de comparação de registros  
- Melhorias na exportação de PDF  
- Visualização de imagens  
- Notificações em tempo real  

### Pendente

- Testes automatizados  
- Deploy para produção  
- Documentação da API  
- Sistema de backup e restauração de dados  

---

## Observações para Desenvolvedores

- Mantenha a estrutura de permissões nas novas funcionalidades  
- Registre todas as ações no histórico dos modelos  
- Siga os padrões de upload definidos nos middlewares  
- Mantenha a separação entre camadas (controladores, serviços, modelos)  
- Respeite o padrão de tratamento de erros estabelecido  

> Este documento fornece uma visão geral do sistema e serve como guia para novos desenvolvedores. Para detalhes de implementação, consulte os comentários no código e a documentação adicional.
