// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

/**
 * @title UQ112x112
 * @dev 112.112 固定小数点数ライブラリ
 */
library UQ112x112 {
    uint224 internal constant Q112 = 2**112;

    // 112ビット整数を224ビット UQ112x112にエンコード
    function encode(uint112 y) internal pure returns (uint224 z) {
        z = uint224(y) * Q112; // 決してオーバーフローしない
    }

    // UQ112x112を112ビット整数で割る
    function uqdiv(uint224 x, uint112 y) internal pure returns (uint224 z) {
        z = x / uint224(y);
    }
}