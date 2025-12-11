const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Holmes Token", function () {
  let holmes;
  let owner;
  let addr1;
  let addr2;

  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();
    const Holmes = await ethers.getContractFactory("Holmes");
    holmes = await Holmes.deploy(owner.address);
    await holmes.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the right name and symbol", async function () {
      expect(await holmes.name()).to.equal("Holmes");
      expect(await holmes.symbol()).to.equal("HOLMES");
    });

    it("Should set the right owner", async function () {
      expect(await holmes.owner()).to.equal(owner.address);
    });

    it("Should have correct decimals", async function () {
      expect(await holmes.decimals()).to.equal(18);
    });
  });

  describe("Free Mint", function () {
    it("Should allow users to free mint", async function () {
      await holmes.connect(addr1).freeMint();
      const balance = await holmes.balanceOf(addr1.address);
      expect(balance).to.equal(ethers.parseEther("1000"));
    });

    it("Should not allow double minting", async function () {
      await holmes.connect(addr1).freeMint();
      await expect(holmes.connect(addr1).freeMint()).to.be.revertedWith(
        "Already minted - everyone gets one chance"
      );
    });

    it("Should emit FreeMint event", async function () {
      await expect(holmes.connect(addr1).freeMint())
        .to.emit(holmes, "FreeMint")
        .withArgs(addr1.address, ethers.parseEther("1000"));
    });

    it("Should track who has minted", async function () {
      expect(await holmes.hasMinted(addr1.address)).to.equal(false);
      await holmes.connect(addr1).freeMint();
      expect(await holmes.hasMinted(addr1.address)).to.equal(true);
    });
  });

  describe("Pausable", function () {
    it("Should allow owner to pause", async function () {
      await holmes.pause();
      expect(await holmes.paused()).to.equal(true);
    });

    it("Should allow owner to unpause", async function () {
      await holmes.pause();
      await holmes.unpause();
      expect(await holmes.paused()).to.equal(false);
    });

    it("Should not allow non-owner to pause", async function () {
      await expect(holmes.connect(addr1).pause()).to.be.reverted;
    });
  });

  describe("Burnable", function () {
    it("Should allow token holders to burn their tokens", async function () {
      await holmes.connect(addr1).freeMint();
      const initialBalance = await holmes.balanceOf(addr1.address);
      await holmes.connect(addr1).burn(ethers.parseEther("100"));
      const finalBalance = await holmes.balanceOf(addr1.address);
      expect(finalBalance).to.equal(initialBalance - ethers.parseEther("100"));
    });
  });
});
