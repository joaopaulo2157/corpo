# Padrões de Desenvolvimento e Contribuição

Este documento define as diretrizes e o fluxo de trabalho para o desenvolvimento deste projeto. Todos os contribuidores, incluindo assistentes de IA, devem seguir estas regras para garantir a qualidade, rastreabilidade e organização do código.

## 1. Gerenciamento de Tarefas com GitHub Issues

Toda e qualquer alteração no código-fonte deve começar com a criação de uma **Issue** no GitHub.

### Tipos de Issue

Cada issue deve ser categorizada usando as seguintes etiquetas (labels):

-   `Correção` (Bug): Para a correção de um comportamento inesperado ou erro no sistema.
-   `Melhoria` (Enhancement): Para refatorações, otimizações de performance ou melhorias em funcionalidades existentes.
-   `Nova Função` (Feature): Para a implementação de uma nova funcionalidade que não existia antes.

## 2. Fluxo de Trabalho com Pull Requests (PRs)

Nenhuma alteração é enviada diretamente para a branch principal. Todo o trabalho deve ser feito em uma branch separada e submetido através de um **Pull Request**.

### Estrutura do Pull Request

Cada Pull Request deve seguir estritamente o template abaixo em sua descrição. Isso é crucial para a revisão e o histórico do projeto.

---

### Template de Descrição para Pull Request

**Issue Relacionada:**
> Mencione a issue que este PR resolve. Ex: `Resolve #123`

**O que mudou?**
> Descreva de forma clara e concisa as alterações implementadas. O que foi adicionado, removido ou modificado?

**Como foi validado?**
> Detalhe os passos que foram tomados para testar e garantir que a mudança funciona como esperado e não introduz novos problemas. Ex: "Testado localmente na página `admin.html`, validando o login com os 3 perfis de usuário."

**Riscos, Limitações e Próximos Passos:**
> - **Riscos:** Existe algum risco potencial com esta mudança? (Ex: "A alteração na API de login pode impactar usuários antigos que não limparam o cache.")
> - **Limitações:** A implementação tem alguma limitação conhecida? (Ex: "A funcionalidade de exportação ainda não suporta o formato PDF.")
> - **Próximos Passos:** Há alguma tarefa de acompanhamento ou melhoria futura planejada? (Ex: "Refatorar o CSS do modal de avaliação em uma issue separada.")

## 3. Esteira de Qualidade (Quality Gates)

Antes de qualquer código ser integrado à branch principal, ele deve aderir aos seguintes pilares de qualidade. A implementação específica de cada ferramenta será gradual, mas os princípios devem ser considerados desde já.

### 3.1. Observabilidade
O sistema deve ser projetado para ser observável, permitindo o monitoramento proativo de sua saúde e performance.
-   **Monitoramento de Erros:** Utilização de ferramentas como **Sentry** para captura e alerta de erros em tempo real.
-   **Monitoramento de Aplicação e Infraestrutura:** Adoção de plataformas como **Datadog** ou **New Relic** para métricas, logs e traces.
-   **Tracing Distribuído:** Implementação do padrão **OpenTelemetry** para rastreamento de requisições de ponta a ponta.

### 3.2. Qualidade e Lint de Código
A manutenção de um código limpo, consistente e de alta qualidade é obrigatória.
-   **Validação de Arquitetura:** Uso de ferramentas como `arch-contract` para garantir que as regras arquiteturais não sejam violadas.
-   **Formatação e Linting:** Aplicação de formatadores e linters como **Biome** para padronização do código e detecção de problemas comuns.
-   **Padrão de Commits:** Adoção de "Conventional Commits" com validação via **Commitlint**.
-   **Detecção de Código Morto:** Utilização de ferramentas como **Knip** para identificar e remover código não utilizado.
-   **Testes de Mutação:** Avaliação da qualidade dos testes unitários com **Stryker**.

### 3.3. Estratégia de Testes
Uma cobertura de testes abrangente é essencial para garantir a estabilidade do sistema.
-   **Testes Unitários:** Cobertura para componentes e funções individuais.
-   **Testes de Integração:** Validação da interação entre diferentes módulos.
-   **Testes End-to-End (E2E):** Automação dos fluxos críticos do usuário com **Playwright** ou **Endtest**.
-   **Cobertura de Código:** Monitoramento do percentual de cobertura com **Codecov** para garantir um patamar mínimo de qualidade.

### 3.4. Segurança e Operação
As práticas de segurança e excelência operacional devem ser parte integral do ciclo de desenvolvimento.
-   **Rate Limiting:** Implementação de limite de requisições nas APIs para prevenir abuso.
-   **Revisão de Segurança:** Realização de auditorias de segurança periódicas no código.
-   **Performance Budget:** Definição e monitoramento de orçamentos de performance para as funcionalidades críticas.
-   **Separação de Responsabilidades:** Manter uma clara distinção arquitetural entre o **Frontend** e o **Backend**.
-   **Conformidade Legal:** Garantir que os **Termos de Uso** e a **Política de Privacidade** sejam revisados e aprovados pelo setor jurídico.

### 3.5. Princípios de Arquitetura
Nossas decisões arquiteturais devem seguir os seguintes princípios para garantir a sustentabilidade do projeto.
-   **Evitar Over-engineering:** Priorizar soluções simples e eficazes em vez de complexidade desnecessária.
-   **Prevenir Bottlenecks:** Identificar e mitigar proativamente possíveis gargalos de performance.
-   **Componentizar desde o Início:** Projetar e construir componentes reutilizáveis como prática padrão.
-   **DRY (Don't Repeat Yourself) com Critério:** Aplicar o princípio de não repetição de forma ponderada, evitando abstrações prematuras que aumentem a complexidade.
-   **Impedir Reconstrução:** Antes de criar um novo componente, verificar se algo similar já existe no projeto para ser reutilizado ou estendido.

## 4. Processo de Design de Interface (UI/UX)

Toda implementação de interface deve seguir um processo de design estruturado em três camadas, garantindo consistência, qualidade e uma excelente experiência do usuário.

### 4.1. Camada 1: Análise de Referência Visual

-   **Análise da Referência:** Antes de codificar, analisar a referência visual fornecida ou o design system existente no projeto.
-   **Extração de Padrões:** Extrair e seguir os padrões de layout, hierarquia visual, espaçamento, densidade da informação, paleta de cores (`style.css`), tipografia e componentes já estabelecidos.

### 4.2. Camada 2: Critério de Qualidade UI/UX

-   **Revisão Abrangente:** Revisar a proposta de design sob a ótica de usabilidade e experiência do usuário.
-   **Checklist de Qualidade:**
    -   **Contraste e Legibilidade:** Garantir que todo texto seja legível e que os contrastes de cor atendam às diretrizes de acessibilidade (WCAG).
    -   **Grid e Alinhamento:** Utilizar um sistema de grid consistente para o layout.
    -   **Responsividade:** Planejar e garantir que a interface funcione perfeitamente em diferentes tamanhos de tela.
    -   **Acessibilidade (A11Y):** Implementar semântica HTML correta, atributos ARIA quando necessário e garantir a navegabilidade por teclado.
    -   **Estados da Interface:** Projetar todos os estados possíveis: vazio (empty state), carregando (loading state), erro (error state) e sucesso.
    -   **Microcopy:** Revisar todos os textos (labels, botões, mensagens de erro) para que sejam claros, concisos e úteis.
-   **Análise de Riscos:** Apontar potenciais riscos de usabilidade ou técnicos antes do início da implementação.

### 4.3. Camada 3: Estratégia de Componentes

-   **Reutilização:** Priorizar o uso de componentes já existentes no projeto para manter a consistência e acelerar o desenvolvimento.
-   **Inspiração Externa:** Se um novo padrão for necessário, buscar inspiração em bibliotecas de UI modernas e bem estabelecidas, como `shadcn/ui`, `21st.dev`, `Magic UI` ou `Aceternity UI`, adaptando-os à nossa identidade visual.
-   **Funcionalidade Acima da Forma:** Evitar a criação de componentes puramente decorativos que não agreguem valor funcional ou não resolvam um problema real do usuário. Cada elemento deve ter um propósito.
