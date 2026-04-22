export function useFloatingPosition() {
  const getPosition = ({
    anchorX,
    anchorY,
    anchorWidth = 0,
    anchorHeight = 0,
    elWidth,
    elHeight,
    gap = 10,
    placement = "right",
  }) => {
    let left = 0;
    let top = 0;

    // 垂直居中（关键）
    const centerTop = anchorY + anchorHeight / 2 - elHeight / 2;

    // ===== 初始位置 =====
    switch (placement) {
      case "right":
        left = anchorX + anchorWidth + gap;
        top = centerTop;
        break;
      case "left":
        left = anchorX - elWidth - gap;
        top = centerTop;
        break;
      case "top":
        left = anchorX + anchorWidth / 2 - elWidth / 2;
        top = anchorY - elHeight - gap;
        break;
      case "bottom":
        left = anchorX + anchorWidth / 2 - elWidth / 2;
        top = anchorY + anchorHeight + gap;
        break;
    }

    // ===== 边界检测 =====

    // 右边溢出 → 放左边
    if (left + elWidth > window.innerWidth) {
      left = anchorX - elWidth - gap;
    }

    // 左边溢出 → 贴边
    if (left < 0) {
      left = 10;
    }

    // 下边溢出
    if (top + elHeight > window.innerHeight) {
      top = window.innerHeight - elHeight - 10;
    }

    // 上边溢出
    if (top < 10) {
      top = 10;
    }

    return {
      left: left + "px",
      top: top + "px",
    };
  };

  return { getPosition };
}
