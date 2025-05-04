## Description
게시판 서버

## Project setup
Node.js redis, mysql 이 설치되어 있어야 합니다(최근 lts를 권장합니다)
.env 파일을 root에 생성하고 각 외부 의존성 설정값을 추가하세요.

패키지 의존성은 아래 커맨드를 따라서 설치할 수 있습니다
```bash
$ npm install
```

데이터베이스 세팅은 root 경로 아래의 board-server.sql의 쿼리를 실행해 주세요

## Compile and run the project

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Run tests

```bash
# unit tests
$ npm run test

# test coverage
$ npm run test:cov
```

## 소프트웨어 구조

Nest.js의 모듈식 레이어드 아키텍쳐 구조를 따릅니다.

1. common module - 공통으로 사용하는 미들웨어나 인터페이스, 외부 의존성 관련 모듈을 포함합니다
2. comments - 댓글 기능 관련 구현 모듈입니다
3. keywords - 키워드 기능 관련 구현 모듈입니다
4. notifications - 알람 기능 관련 구현 모듈입니다
5. posts - 게시물 기능 관련 구현 모듈입니다
