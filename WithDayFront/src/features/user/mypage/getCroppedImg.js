//프로필 이미지

export const getCroppedImg = (imageSrc, cropPixels) => {
    return new Promise((resolve, reject) => {
        const image = new Image();

        image.crossOrigin = "anonymous";
        image.src = imageSrc;

        image.onload = () => {
            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d");

            if (!ctx) {
                reject(new Error("canvas context를 생성하지 못했습니다."));
                return;
            }

            const outputSize = 400;

            canvas.width = outputSize;
            canvas.height = outputSize;

            ctx.drawImage(
                image,
                cropPixels.x,
                cropPixels.y,
                cropPixels.width,
                cropPixels.height,
                0,
                0,
                outputSize,
                outputSize
            );

            canvas.toBlob(
                (blob) => {
                    if (!blob) {
                        reject(new Error("이미지 변환에 실패했습니다."));
                        return;
                    }

                    const file = new File([blob], "profile-image.jpg", {
                        type: "image/jpeg",
                    });

                    resolve(file);
                },
                "image/jpeg",
                0.82
            );
        };

        image.onerror = () => {
            reject(new Error("이미지를 불러오지 못했습니다."));
        };
    });
};