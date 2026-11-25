# Hướng dẫn deploy Agent Mint Alerts lên BNB Chain (mainnet)

Dự án thi Agent ID Hackathon của Binance. Người deploy: Diệt, bằng ví Web3 Binance của anh trên máy tính.
Hợp đồng: `AgentMintAlerts` — không owner, không phí, không token. Deploy chỉ tốn gas (~0,000018 BNB).

## Chuẩn bị (đã xong)

- Ví Web3 Binance của anh: `0x552c61ca7ad657e86fed3a47cdf85c7384d1cf7f` — đã có **0,001 BNB** (chuyển từ ví Agent lúc 23:25 ngày 24/11, đủ deploy nhiều lần).
- File code hợp đồng: `AgentMintAlerts.sol` (đính kèm cùng hướng dẫn này).
- Trình duyệt: Chrome trên máy tính.

## Bước 1 — Cài extension Binance Wallet (nếu chưa có)

1. Mở Chrome, vào Chrome Web Store, tìm **Binance Wallet** (hàng chính chủ của Binance), bấm Add to Chrome.
2. Mở extension, chọn kết nối ví Web3 Binance của anh. Extension sẽ hiện mã để anh quét bằng app Binance trên điện thoại — đây là ví chính chủ của Binance nên quét mã này để nối extension là bình thường, khác hẳn mã QR login của dự án lạ.
3. Kiểm tra extension hiện đúng ví `0x552c…` (đuôi `d1cf7f`).

## Bước 2 — Mở Remix

Mở https://remix.ethereum.org trên Chrome.

## Bước 3 — Tạo file hợp đồng

1. Bấm biểu tượng file ở cột trái, tạo file mới tên `AgentMintAlerts.sol`.
2. Mở file `AgentMintAlerts.sol` đính kèm, copy toàn bộ nội dung, dán vào file vừa tạo trong Remix, bấm lưu (Ctrl+S).

## Bước 4 — Compile

1. Bấm biểu tượng Solidity Compiler ở cột trái (chữ S).
2. Compiler chọn **0.8.26**.
3. Bật **Optimization**, ô runs để **200**.
4. Bấm **Compile AgentMintAlerts.sol**. Compile xong không được báo lỗi đỏ.

## Bước 5 — Deploy

1. Bấm biểu tượng Deploy & Run ở cột trái.
2. Mục Environment chọn **Injected Provider - Binance Wallet**.
3. Kiểm tra kỹ 2 thứ trước khi bấm Deploy:
   - **Account** hiện đúng ví `0x552c61ca7ad657e86fed3a47cdf85c7384d1cf7f`.
   - **Mạng là BSC Mainnet** (chain 56). Nếu đang ở Ethereum hay mạng khác thì chuyển sang BSC Mainnet trong extension.
4. Mục Contract chọn **AgentMintAlerts**.
5. Bấm **Deploy**. Extension hiện cửa sổ xác nhận: kiểm tra value = 0, gas khoảng 353.410, phí khoảng 0,000018 BNB, rồi bấm xác nhận.
6. Chờ vài giây, Remix hiện hợp đồng đã deploy ở mục Deployed Contracts.

## Bước 6 — Gửi địa chỉ hợp đồng cho Pax

Copy **địa chỉ hợp đồng** vừa deploy (bấm vào tên hợp đồng trong mục Deployed Contracts để xem) và **tx hash** (link trong cửa sổ xác nhận hoặc trong lịch sử extension), gửi cho Pax qua chat.

Pax sẽ lo phần còn lại: verify code trên BscScan + Sourcify, cập nhật địa chỉ vào web, test subscribe/claim một lần bằng ví Agent (mrchrismast.ai) rồi mới nộp bài thi.

## Xử lý lỗi thường gặp

- **Remix hiện ví khác 0x552c…**: extension khác (ví dụ MetaMask) đang chiếm quyền nối. Tắt tạm extension đó đi rồi tải lại trang Remix.
- **Mạng không phải BSC**: chuyển mạng sang BSC Mainnet trong extension Binance Wallet trước khi bấm Deploy.
- **Compile báo lỗi**: kiểm tra lại compiler đúng 0.8.26 và Optimization đang bật, runs = 200; code dán vào phải đầy đủ, không thiếu dòng nào.
- **Extension không nối được ví**: mở lại app Binance trên điện thoại, vào mục Web3 để chắc ví đang mở, rồi thử kết nối lại.

## Tóm tắt thông số kỹ thuật (để đối chiếu)

- Chain: BNB Smart Chain mainnet, chain ID 56.
- Compiler: Solidity 0.8.26, optimizer bật, 200 runs.
- Constructor: không có (không cần điền tham số nào).
- Value: 0. Không phí, không token.
- Registry Agent ID trong hợp đồng: `0x60B9262456dE011F7d15a54CdD8c48bAaa8B022F`.
- Gas deploy đo được: 353.410.
